import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  AccountTransactionDto, 
  CreateAccountTransactionRequest, 
  UpdateAccountTransactionRequest, 
  RecordAdvanceRecoveryRequest, 
  AccountsSummaryDto,
  AccountTransactionType,
  AdvanceRecoveryStatus
} from '@people-hub/shared-types';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper to map a Prisma AccountTransaction entity to AccountTransactionDto
   */
  private mapToDto(t: any): AccountTransactionDto {
    return {
      id: t.id,
      tenantId: t.tenantId,
      type: t.type,
      category: t.category,
      amount: Number(t.amount),
      transactionDate: t.transactionDate instanceof Date ? t.transactionDate.toISOString().split('T')[0] : String(t.transactionDate),
      paymentMode: t.paymentMode,
      referenceNo: t.referenceNo,
      payeePayer: t.payeePayer,
      description: t.description,
      status: t.status,
      employeeId: t.employeeId,
      employeeCode: t.employee?.employeeCode || null,
      employeeName: t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : null,
      employeeDepartment: t.employee?.department || null,
      recoveryStatus: t.recoveryStatus,
      recoveredAmount: Number(t.recoveredAmount || 0),
      settlementDate: t.settlementDate ? (t.settlementDate instanceof Date ? t.settlementDate.toISOString().split('T')[0] : String(t.settlementDate)) : null,
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
      updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt)
    };
  }

  /**
   * Retrieve list of transactions with optional filtering directly from DB
   */
  async getTransactions(
    tenantId: string, 
    query: { type?: string; employeeId?: string; startDate?: string; endDate?: string; search?: string }
  ): Promise<AccountTransactionDto[]> {

    const where: any = { tenantId };

    if (query.type && query.type !== 'ALL') {
      where.type = query.type;
    }

    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) {
        where.transactionDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // Include full day
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { category: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { referenceNo: { contains: s, mode: 'insensitive' } },
        { payeePayer: { contains: s, mode: 'insensitive' } },
        { employee: { firstName: { contains: s, mode: 'insensitive' } } },
        { employee: { lastName: { contains: s, mode: 'insensitive' } } },
        { employee: { employeeCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const records = await this.prisma.tenantClient.accountTransaction.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    return records.map(r => this.mapToDto(r));
  }

  /**
   * Retrieve accounts financial summary metrics directly from DB
   */
  async getSummary(tenantId: string): Promise<AccountsSummaryDto> {
    const transactions = await this.prisma.tenantClient.accountTransaction.findMany({
      where: { 
        tenantId,
        status: { not: 'CANCELLED' }
      }
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let totalAdvance = 0;
    let totalAdvanceOutstanding = 0;

    for (const t of transactions) {
      const amount = Number(t.amount || 0);
      const recovered = Number(t.recoveredAmount || 0);

      if (t.type === AccountTransactionType.INCOME) {
        totalIncome += amount;
      } else if (t.type === AccountTransactionType.EXPENSE) {
        totalExpense += amount;
      } else if (t.type === AccountTransactionType.EMPLOYEE_ADVANCE) {
        totalAdvance += amount;
        const outstanding = Math.max(0, amount - recovered);
        totalAdvanceOutstanding += outstanding;
      }
    }

    // Cashflow: Inflows minus operational expenses and outstanding cash advances given out
    const netCashflow = totalIncome - totalExpense - totalAdvanceOutstanding;

    return {
      totalIncome,
      totalExpense,
      totalAdvance,
      totalAdvanceOutstanding,
      netCashflow,
      transactionCount: transactions.length
    };
  }

  /**
   * Retrieve list of employee advances specifically directly from DB
   */
  async getEmployeeAdvances(tenantId: string): Promise<AccountTransactionDto[]> {
    const records = await this.prisma.tenantClient.accountTransaction.findMany({
      where: {
        tenantId,
        type: AccountTransactionType.EMPLOYEE_ADVANCE
      },
      include: {
        employee: true
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    return records.map(r => this.mapToDto(r));
  }

  /**
   * Create a new cashflow transaction (Income, Expense, or Employee Advance)
   */
  async createTransaction(
    tenantId: string, 
    userId: string | null, 
    dto: CreateAccountTransactionRequest
  ): Promise<AccountTransactionDto> {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Transaction amount must be greater than zero.');
    }

    if (!dto.category || !dto.category.trim()) {
      throw new BadRequestException('Transaction category is required.');
    }

    let employee = null;
    let payeePayer = dto.payeePayer || null;

    if (dto.type === AccountTransactionType.EMPLOYEE_ADVANCE) {
      if (dto.employeeId) {
        employee = await this.prisma.tenantClient.employee.findUnique({
          where: { id: dto.employeeId }
        });
        if (employee && !payeePayer) {
          payeePayer = `${employee.firstName} ${employee.lastName}`;
        }
      }
    }

    const referenceNo = dto.referenceNo?.trim() || 
      (dto.type === AccountTransactionType.EMPLOYEE_ADVANCE ? `ADV-${Date.now().toString().slice(-6)}` : `TXN-${Date.now().toString().slice(-6)}`);

    const created = await this.prisma.tenantClient.accountTransaction.create({
      data: {
        tenantId,
        type: dto.type,
        category: dto.category.trim(),
        amount: dto.amount,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
        paymentMode: dto.paymentMode || 'CASH',
        referenceNo,
        payeePayer,
        description: dto.description?.trim() || null,
        status: 'COMPLETED',
        employeeId: dto.employeeId || null,
        recoveryStatus: dto.type === AccountTransactionType.EMPLOYEE_ADVANCE ? AdvanceRecoveryStatus.OUTSTANDING : null,
        recoveredAmount: 0,
        recordedBy: userId
      },
      include: {
        employee: true
      }
    });

    return this.mapToDto(created);
  }

  /**
   * Update transaction details
   */
  async updateTransaction(
    tenantId: string, 
    id: string, 
    dto: UpdateAccountTransactionRequest
  ): Promise<AccountTransactionDto> {
    const existing = await this.prisma.tenantClient.accountTransaction.findUnique({
      where: { id }
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Transaction record not found.');
    }

    const data: any = {};
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.amount !== undefined) {
      if (dto.amount <= 0) throw new BadRequestException('Amount must be positive.');
      data.amount = dto.amount;
    }
    if (dto.transactionDate !== undefined) data.transactionDate = new Date(dto.transactionDate);
    if (dto.paymentMode !== undefined) data.paymentMode = dto.paymentMode;
    if (dto.referenceNo !== undefined) data.referenceNo = dto.referenceNo.trim();
    if (dto.payeePayer !== undefined) data.payeePayer = dto.payeePayer.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.tenantClient.accountTransaction.update({
      where: { id },
      data,
      include: {
        employee: true
      }
    });

    return this.mapToDto(updated);
  }

  /**
   * Record recovery or repayment on an employee salary advance
   */
  async recordAdvanceRecovery(
    tenantId: string, 
    id: string, 
    dto: RecordAdvanceRecoveryRequest
  ): Promise<AccountTransactionDto> {
    const existing = await this.prisma.tenantClient.accountTransaction.findUnique({
      where: { id }
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Advance record not found.');
    }

    if (existing.type !== AccountTransactionType.EMPLOYEE_ADVANCE) {
      throw new BadRequestException('Selected transaction is not an employee advance.');
    }

    const currentRecovered = Number(existing.recoveredAmount || 0);
    const newTotalRecovered = currentRecovered + Number(dto.recoveredAmount || 0);
    const totalAmount = Number(existing.amount);

    let recoveryStatus = AdvanceRecoveryStatus.PARTIAL;
    let settlementDate = existing.settlementDate;

    if (newTotalRecovered >= totalAmount) {
      recoveryStatus = AdvanceRecoveryStatus.SETTLED;
      settlementDate = new Date();
    } else if (newTotalRecovered <= 0) {
      recoveryStatus = AdvanceRecoveryStatus.OUTSTANDING;
    }

    let updatedDescription = existing.description || '';
    if (dto.notes) {
      updatedDescription += ` | Recovery of ₹${dto.recoveredAmount} recorded: ${dto.notes}`;
    }

    const updated = await this.prisma.tenantClient.accountTransaction.update({
      where: { id },
      data: {
        recoveredAmount: Math.min(newTotalRecovered, totalAmount),
        recoveryStatus,
        settlementDate,
        description: updatedDescription
      },
      include: {
        employee: true
      }
    });

    return this.mapToDto(updated);
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(tenantId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.tenantClient.accountTransaction.findUnique({
      where: { id }
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Transaction record not found.');
    }

    await this.prisma.tenantClient.accountTransaction.delete({
      where: { id }
    });

    return { success: true };
  }
}
