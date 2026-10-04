import { prisma } from "../lib/prisma";

export const generateHubCode = async(zoneName : string)  => {

    const cleanZone = zoneName.trim().replace(/[^a-zA-Z]/g, '');
    const prefix = (cleanZone.substring(0, 3) || 'HUB').toUpperCase();


   const count = await prisma.hub.count({
    where: { zone: { contains: zoneName, mode: 'insensitive' } },
  
});

  const serial = String(count + 1).padStart(2, '0');
  return `HUB-${prefix}-${serial}`;

}