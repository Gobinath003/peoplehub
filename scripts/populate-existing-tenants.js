const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Populating existing tenants with official business details...');

  const garments = await prisma.tenant.findFirst({
    where: { OR: [{ slug: 'abc-garments' }, { industry: 'GARMENTS' }] }
  });

  if (garments) {
    await prisma.tenant.update({
      where: { id: garments.id },
      data: {
        address: 'Plot No. 42-45, Guindy Industrial Estate, Ekkattuthangal, Chennai - 600032, Tamil Nadu, India',
        phone: '+91 44 2250 1890',
        email: 'info@abcgarments.com',
        website: 'https://www.abcgarments.com',
        taxId: '33AABCA1234F1Z8', // GSTIN
        registrationNo: 'U18101TN2020PTC135890', // CIN
      }
    });
    console.log(`Updated ABC Garments Ltd (${garments.id})`);
  }

  const logistics = await prisma.tenant.findFirst({
    where: { OR: [{ slug: 'chennai-logistics' }, { industry: 'LOGISTICS' }] }
  });

  if (logistics) {
    await prisma.tenant.update({
      where: { id: logistics.id },
      data: {
        address: 'No. 88, Grand Southern Trunk Road, Chromepet, Chennai - 600044, Tamil Nadu, India',
        phone: '+91 44 2238 9900',
        email: 'contact@chennailogistics.in',
        website: 'https://www.chennailogistics.in',
        taxId: '33AABCC5678G2Z1', // GSTIN
        registrationNo: 'U63090TN2019PTC129440', // CIN
      }
    });
    console.log(`Updated Chennai Logistics Co (${logistics.id})`);
  }

  await prisma.$disconnect();
  console.log('Finished updating existing tenants!');
}

main().catch(err => {
  console.error('Error updating tenants:', err);
  prisma.$disconnect();
  process.exit(1);
});
