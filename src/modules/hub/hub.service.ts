import { prisma } from "../../lib/prisma";
import { generateHubCode } from "../../utils/hub";

import { ICreateHubPayload, IHubFilterOptions, IUpdateHubPayload } from "./hub.interface";


const createHubIntoDB = async(payload : ICreateHubPayload) =>{
    

    let finalCode = payload.code?.toUpperCase().trim();

    if(!finalCode){
      
        finalCode = await generateHubCode(payload.zone)
    }else {
        const existing = await prisma.hub.findUnique({
            where : {code : finalCode}
        });
        if(existing){
            throw new Error("Hub Code Has Already Been Used")
        }
    }

    return await prisma.hub.create({
        data : {
            name : payload.name,
            code : finalCode,
            address:payload.address,
              zone: payload.zone,
             contactNo: payload.contactNo,
            latitude: payload.latitude || null,
            longitude: payload.longitude || null,
        }
    })
}


export const getAllHubsFromDB = async (filters: IHubFilterOptions) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const { searchTerm, zone, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const andConditions: any[] = [{ deletedAt: null }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
        { address: { contains: searchTerm, mode: 'insensitive' } },
      ],
    });
  }

  if (zone) {
    andConditions.push({
      zone: { contains: zone, mode: 'insensitive' },
    });
  }

  const whereConditions = { AND: andConditions };

  const [hubs, total] = await Promise.all([
    prisma.hub.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.hub.count({ where: whereConditions }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: hubs,
  };
};


export const getHubByIdFromDB = async (id: string) => {
  const hub = await prisma.hub.findFirst({
    where: { id, deletedAt: null },
  });

  if (!hub) {
    throw new Error('Hubs Are Not Found');
  }

  return hub;
};

const updateHubInDB = async(id : string,payload: IUpdateHubPayload)=>{
  const hub = await prisma.hub.findFirst({
    where : {
      id ,
      deletedAt: null
    }
  })

  if(!hub){
    throw new Error("Hub Not Founded")
  }

  return await prisma.hub.update({
    where : {id},
    data : payload
  })



}





export const hubService = {
    createHubIntoDB,
    getAllHubsFromDB,
    getHubByIdFromDB,
    updateHubInDB
}