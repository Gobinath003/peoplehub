import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest, 
  RefreshTokenResponse, 
  IndustryType 
} from '@people-hub/shared-types';

class RegisterDto {
  email!: string;
  passwordHash!: string;
  firstName!: string;
  lastName!: string;
}

class CreateTenantDto {
  name!: string;
  slug!: string;
  industry!: IndustryType;
}

class SwitchTenantDto {
  tenantId!: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new global user account' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 499, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.passwordHash, dto.firstName, dto.lastName);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and retrieve tokens' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid login credentials' })
  async login(@Body() dto: LoginRequest): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh an expired access token using valid refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  async refresh(@Body() dto: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-tenant')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch active tenant scope context' })
  @ApiResponse({ status: 200, description: 'Context successfully switched' })
  @ApiResponse({ status: 403, description: 'No permission to access specified tenant' })
  async switchTenant(@Request() req: any, @Body() dto: SwitchTenantDto): Promise<LoginResponse> {
    return this.authService.switchTenant(req.user.id, dto.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-tenant')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new SaaS tenant company' })
  @ApiResponse({ status: 201, description: 'Tenant successfully created' })
  @ApiResponse({ status: 409, description: 'Tenant slug already taken' })
  async createTenant(@Request() req: any, @Body() dto: CreateTenantDto) {
    return this.authService.createTenant(req.user.id, dto.name, dto.slug, dto.industry);
  }
}
