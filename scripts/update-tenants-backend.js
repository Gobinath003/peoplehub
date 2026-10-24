const fs = require('fs');

// 1. Update tenants.controller.ts
const ctrlPath = 'apps/api/src/tenants/tenants.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

const oldDto = `class CreateTenantDto implements CreateTenantWithAdminRequest {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  industry!: IndustryType;

  @IsString()
  adminEmail!: string;`;

const newDto = `class CreateTenantDto implements CreateTenantWithAdminRequest {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  industry!: IndustryType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  registrationNo?: string;

  @IsString()
  adminEmail!: string;`;

if (ctrl.includes('class CreateTenantDto implements CreateTenantWithAdminRequest {')) {
  ctrl = ctrl.replace(oldDto, newDto);
  ctrl = ctrl.replace(oldDto.replace(/\n/g, '\r\n'), newDto.replace(/\n/g, '\r\n'));
  fs.writeFileSync(ctrlPath, ctrl, 'utf8');
  console.log('Updated tenants.controller.ts');
}

// 2. Update tenants.service.ts
const srvPath = 'apps/api/src/tenants/tenants.service.ts';
let srv = fs.readFileSync(srvPath, 'utf8');

const oldListMap = `status: t.status,
      createdAt: t.createdAt.toISOString(),`;

const newListMap = `status: t.status,
      address: t.address,
      phone: t.phone,
      email: t.email,
      website: t.website,
      taxId: t.taxId,
      registrationNo: t.registrationNo,
      createdAt: t.createdAt.toISOString(),`;

srv = srv.replace(oldListMap, newListMap);
srv = srv.replace(oldListMap.replace(/\n/g, '\r\n'), newListMap.replace(/\n/g, '\r\n'));

const oldCreate = `status: 'ACTIVE',
        }`;

const newCreate = `status: 'ACTIVE',
          address: dto.address || null,
          phone: dto.phone || null,
          email: dto.email || null,
          website: dto.website || null,
          taxId: dto.taxId || null,
          registrationNo: dto.registrationNo || null,
        }`;

srv = srv.replace(oldCreate, newCreate);
srv = srv.replace(oldCreate.replace(/\n/g, '\r\n'), newCreate.replace(/\n/g, '\r\n'));
fs.writeFileSync(srvPath, srv, 'utf8');
console.log('Updated tenants.service.ts');

// 3. Update auth.service.ts
const authPath = 'apps/api/src/auth/auth.service.ts';
let auth = fs.readFileSync(authPath, 'utf8');

const oldAuthMap = `industry: tu.tenant.industry as IndustryType
    }));`;

const newAuthMap = `industry: tu.tenant.industry as IndustryType,
      address: tu.tenant.address,
      phone: tu.tenant.phone,
      email: tu.tenant.email,
      website: tu.tenant.website,
      taxId: tu.tenant.taxId,
      registrationNo: tu.tenant.registrationNo
    }));`;

auth = auth.replaceAll(oldAuthMap, newAuthMap);
auth = auth.replaceAll(oldAuthMap.replace(/\n/g, '\r\n'), newAuthMap.replace(/\n/g, '\r\n'));
fs.writeFileSync(authPath, auth, 'utf8');
console.log('Updated auth.service.ts');
