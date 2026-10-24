const fs = require('fs');
const path = 'apps/api/prisma/schema.prisma';
let c = fs.readFileSync(path, 'utf8');

const target = 'status    String         // ACTIVE, SUSPENDED, DEACTIVATED';
const replacement = `status    String         // ACTIVE, SUSPENDED, DEACTIVATED
  address        String?
  phone          String?
  email          String?
  website        String?
  taxId          String?        @map("tax_id")
  registrationNo String?        @map("registration_no")`;

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync(path, c, 'utf8');
  console.log('Successfully updated schema.prisma Tenant model');
} else {
  console.log('Target not found in schema.prisma');
}
