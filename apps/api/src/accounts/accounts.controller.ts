import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { 
  AccountTransactionDto, 
  CreateAccountTransactionRequest, 
  UpdateAccountTransactionRequest, 
  RecordAdvanceRecoveryRequest, 
  AccountsSummaryDto,
  AccountTransactionType,
  PaymentMode,
  AdvanceRecoveryStatus
} from '@people-hub/shared-types';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

class CreateTransactionDto implements CreateAccountTransactionRequest {
  @IsString()
  type!: string;

  @IsString()
  category!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  transactionDate!: string;

  @IsString()
  paymentMode!: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  payeePayer?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

class UpdateTransactionDto implements UpdateAccountTransactionRequest {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  paymentMode?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  payeePayer?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

class RecordRecoveryDto implements RecordAdvanceRecoveryRequest {
  @IsNumber()
  recoveredAmount!: number;

  @IsString()
  recoveryStatus!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('Accounts & Cashflow')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID' })
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('api/v1/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get overall financial metrics (Income, Expense, Advances, Net Cashflow)' })
  @ApiResponse({ status: 200, description: 'Accounts summary metrics' })
  async getSummary(
    @CurrentTenantId() tenantId: string
  ): Promise<AccountsSummaryDto> {
    return this.accountsService.getSummary(tenantId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get list of transactions with optional filtering' })
  @ApiResponse({ status: 200, description: 'List of account transactions' })
  async getTransactions(
    @CurrentTenantId() tenantId: string,
    @Query('type') type?: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ): Promise<AccountTransactionDto[]> {
    return this.accountsService.getTransactions(tenantId, {
      type,
      employeeId,
      startDate,
      endDate,
      search,
    });
  }

  @Get('advances')
  @ApiOperation({ summary: 'Get all employee salary advances with recovery statuses' })
  @ApiResponse({ status: 200, description: 'List of employee advances' })
  async getEmployeeAdvances(
    @CurrentTenantId() tenantId: string
  ): Promise<AccountTransactionDto[]> {
    return this.accountsService.getEmployeeAdvances(tenantId);
  }

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a new income, expense, or employee advance transaction' })
  @ApiResponse({ status: 201, description: 'Created transaction' })
  async createTransaction(
    @CurrentTenantId() tenantId: string,
    @Request() req: any,
    @Body() dto: CreateTransactionDto,
  ): Promise<AccountTransactionDto> {
    const userId = req.user?.id || null;
    return this.accountsService.createTransaction(tenantId, userId, dto);
  }

  @Put('transactions/:id')
  @ApiOperation({ summary: 'Update an existing transaction record' })
  @ApiResponse({ status: 200, description: 'Updated transaction' })
  async updateTransaction(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<AccountTransactionDto> {
    return this.accountsService.updateTransaction(tenantId, id, dto);
  }

  @Post('advances/:id/recovery')
  @ApiOperation({ summary: 'Record repayment or recovery against an employee advance' })
  @ApiResponse({ status: 200, description: 'Updated advance with recovery details' })
  async recordAdvanceRecovery(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RecordRecoveryDto,
  ): Promise<AccountTransactionDto> {
    return this.accountsService.recordAdvanceRecovery(tenantId, id, dto);
  }

  @Delete('transactions/:id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction deleted' })
  async deleteTransaction(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.accountsService.deleteTransaction(tenantId, id);
  }
}
