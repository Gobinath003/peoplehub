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
   * Auto-seed initial demo transactions for a new tenant so the accounts view isn't completely empty
   */
  private async autoSeedIfEmpty(tenantId: string): Promise<void> {
    const count = await this.prisma.tenantClient.accountTransaction.count({
      where: { tenantId }
    });

    if (count > 0) return;

    // Fetch existing active employees for realistic advance attachment
    const employees = await this.prisma.tenantClient.employee.findMany({
      where: { tenantId },
      take: 2,
      orderBy: { createdAt: 'asc' }
    });

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0];
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0];

    const initialTransactions: any[] = [
      {
        tenantId,
        type: AccountTransactionType.INCOME,
        category: 'Client Project Billing',
        amount: 85000,
        transactionDate: new Date(tenDaysAgo),
        paymentMode: 'BANK_TRANSFER',
        referenceNo: 'INV-2026-081',
        payeePayer: 'AcroTex Global Corp',
        description: 'Milestone 2 export shipment invoice settlement',
        status: 'COMPLETED'
      },
      {
        tenantId,
        type: AccountTransactionType.INCOME,
        category: 'Services & Consulting',
        amount: 25000,
        transactionDate: new Date(fiveDaysAgo),
        paymentMode: 'UPI',
        referenceNo: 'UPI-994827104',
        payeePayer: 'Apex Logistics Ltd',
        description: 'Contractual technical advisory retainer fee',
        status: 'COMPLETED'
      },
      {
        tenantId,
        type: AccountTransactionType.EXPENSE,
        category: 'Facility Rent & Utilities',
        amount: 32000,
        transactionDate: new Date(tenDaysAgo),
        paymentMode: 'BANK_TRANSFER',
        referenceNo: 'RENT-OCT-2026',
        payeePayer: 'Commercial Plaza Realty',
        description: 'Monthly plant unit office space lease payment',
        status: 'COMPLETED'
      },
      {
        tenantId,
        type: AccountTransactionType.EXPENSE,
        category: 'Pantry & Daily Refreshments',
        amount: 3500,
        transactionDate: new Date(today),
        paymentMode: 'CASH',
        referenceNo: 'PETTY-014',
        payeePayer: 'Annapoorna Caterers',
        description: 'Weekly tea, coffee, and refreshments for factory floor',
        status: 'COMPLETED'
      }
    ];

    if (employees.length > 0) {
      initialTransactions.push({
        tenantId,
        type: AccountTransactionType.EMPLOYEE_ADVANCE,
        category: 'Salary Advance',
        amount: 8000,
        transactionDate: new Date(fiveDaysAgo),
        paymentMode: 'CASH',
        referenceNo: 'ADV-2026-001',
        payeePayer: `${employees[0].firstName} ${employees[0].lastName}`,
        description: 'Urgent medical assistance salary advance',
        status: 'COMPLETED',
        employeeId: employees[0].id,
        recoveryStatus: AdvanceRecoveryStatus.PARTIAL,
        recoveredAmount: 3000,
      });

      if (employees.length > 1) {
        initialTransactions.push({
          tenantId,
          type: AccountTransactionType.EMPLOYEE_ADVANCE,
          category: 'Festival Advance',
          amount: 5000,
          transactionDate: new Date(today),
          paymentMode: 'UPI',
          referenceNo: 'ADV-2026-002',
          payeePayer: `${employees[1].firstName} ${employees[1].lastName}`,
          description: 'Festival season advance repayment over two salary cycles',
          status: 'COMPLETED',
          employeeId: employees[1].id,
          recoveryStatus: AdvanceRecoveryStatus.OUTSTANDING,
          recoveredAmount: 0,
        });
      }
    }

    for (const item of initialTransactions) {
      await this.prisma.tenantClient.accountTransaction.create({
        data: item
      });
    }
  }

  /**
   * Retrieve list of transactions with optional filtering
   */
  async getTransactions(
    tenantId: string, 
    query: { type?: string; employeeId?: string; startDate?: string; endDate?: string; search?: string }
  ): Promise<AccountTransactionDto[]> {
    await this.autoSeedIfEmpty(tenantId);

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
   * Retrieve accounts financial summary metrics
   */
  async getSummary(tenantId: string): Promise<AccountsSummaryDto> {
    await this.autoSeedIfEmpty(tenantId);

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
   * Retrieve list of employee advances specifically
   */
  async getEmployeeAdvances(tenantId: string): Promise<AccountTransactionDto[]> {
    await this.autoSeedIfEmpty(tenantId);

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
