import config from "../../config";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middlewares/auth";
import { ICalculatePricePayload, ICreateShipmentPayload, IShipmentFilterOptions, IUpdateShipmentPayload } from "./shipment.interface";
import { computeShipmentCost, generateTrackingNumber } from "./shipment.utils";


const calculateShipmentPriceFromDB = async(payload: ICalculatePricePayload)=>{
   
   
   
    const [originHub, destHub] = await Promise.all([
    prisma.hub.findFirst({ where: { id: payload.originHubId, deletedAt: null } }),
    prisma.hub.findFirst({ where: { id: payload.destinationHubId, deletedAt: null } }),
  
]);

   if(!originHub || !destHub){

    throw new Error("Sender Or Recierver is Not Right Or Currently off")
   }

   const isSameZone = originHub.zone.toLowerCase() === destHub.zone.toLowerCase()

   
   return computeShipmentCost({
    weightKg: Number(payload.weightKg),
    lengthCm: Number(payload.lengthCm),
    widthCm: Number(payload.widthCm),
    heightCm: Number(payload.heightCm),
    isSameZone,
    isFragile: payload.isFragile,
  });

}


const createShipmentIntoDB = async(user : RequestUser,payload:ICreateShipmentPayload) =>{
    if (!user || !user.userId) {
        throw new Error("You are not authorized. Please log in to access this resource.");
    }

    const customer = await prisma.customer.findUnique({
        where : {
            userId : user.userId
        }
    })

    if(!customer){
        throw new Error("Customer Profile Not Found");
    }

    const [originHub, destHub] = await Promise.all([
    prisma.hub.findFirst({ where: { id: payload.originHubId, deletedAt: null } }),
    prisma.hub.findFirst({ where: { id: payload.destinationHubId, deletedAt: null } }),
  ]);

  if(!originHub || !destHub){
    throw new Error("Selected Hub Is Wrong")
  
}

const isSameZone = originHub.zone.toLowerCase() === destHub.zone.toLowerCase()



   const priceDetails = computeShipmentCost({
    weightKg : Number(payload.weightKg),
    lengthCm : Number(payload.lengthCm),
    widthCm: Number(payload.widthCm),
    heightCm: Number(payload.heightCm),
    isSameZone,
    isFragile: payload.isFragile,
   })


   const trackingNumber = generateTrackingNumber();

   return await prisma.$transaction(async(tx)=>{
    const shipment = await prisma.shipment.create({
        data : {
            trackingNumber,
            customerId: customer.id,
            originHubId : payload.originHubId,
            destinationHubId: payload.destinationHubId,
            senderName: payload.senderName,
            senderPhone : payload.senderPhone,
            senderAddress:payload.senderAddress,
            receiverName:payload.receiverName,
            receiverPhone:payload.receiverPhone,
            receiverAddress:payload.receiverAddress,
            weightKg:priceDetails.actualWeightKg,
            lengthCm: Number(payload.lengthCm),
            widthCm : Number(payload.widthCm),
            heightCm : Number(payload.heightCm),
            chargeableWeightKg:priceDetails.chargeableWeightKg,
            baseFare : priceDetails.baseFare,
            surcharge : priceDetails.surcharge,
            totalCost:priceDetails.totalCost,
            status:'PAYMENT_PENDING',
            deliveryNotes:payload.deliveryNotes || null

        },
        include: {
        originHub: { select: { name: true, code: true, zone: true } },
        destinationHub: { select: { name: true, code: true, zone: true } },
      },

    });

    await tx.shipmentLog.create({
        data : {
            shipmentId : shipment.id,
            fromStatus : 'ORDER_PLACED',
            toStatus : 'PAYMENT_PENDING',
            performedById :user.userId,
            remarks : 'Parcel Has Been Booked...It Is Waiting For Payment'
        }
    })

    return shipment
   })

}


 const getAllShipmentsFromDB = async(user: RequestUser, filters:IShipmentFilterOptions) =>{
    if (!user || !user.role) {
        throw new Error("You are not authorized. Please log in to access this resource.");
    }

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const {status,searchTerm,sortBy = 'createdAt',sortOrder='desc'} = filters;


    const andConditions : any[] = [{deletedAt : null}];

    if (user.role === 'CUSTOMER') {
    const customer = await prisma.customer.findUnique({ where: { userId: user.userId } });
    andConditions.push({ customerId: customer?.id || 'NO_ACCESS' });
  } else if (user.role === 'COURIER') {
    andConditions.push({ courierId: user.userId });
  }


  if(status) {
    andConditions.push({status});
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { trackingNumber: { contains: searchTerm, mode: 'insensitive' } },
        { receiverPhone: { contains: searchTerm, mode: 'insensitive' } },
        { receiverName: { contains: searchTerm, mode: 'insensitive' } },
      ],
    });
  };

  const whereConditions = { AND: andConditions };

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        originHub: { select: { name: true, code: true } },
        destinationHub: { select: { name: true, code: true } },
      },
    }),
    prisma.shipment.count({ where: whereConditions }),
  ]);



  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: shipments,
  };
 }


 const getShipmentByIdFromDB = async(user:RequestUser,shipmentId: string) =>{

    if (!user || !user.role) {
        throw new Error("You are not authorized. Please log in to access this resource.");
    }

    const shipment = await prisma.shipment.findFirst({
      where : {
        id : shipmentId,
        deletedAt:null
      },
      include : {
        originHub:true,
        destinationHub:true,
        customer: { select: { name: true, email: true, alternatePhone: true } },
      statusLogs: {
        orderBy: { createdAt: 'asc' },
        include: { performedBy: { select: { name: true, role: true } } },
      }}
    });

    if(!shipment){
      throw new Error("The Shipment Not Found")
    }

    if (user.role === 'CUSTOMER') {
    const customer = await prisma.customer.findUnique({ where: { userId: user.userId } });
    if (!customer || shipment.customerId !== customer.id) {
      throw new Error('Unauthorized Access');
    }
  }

 return shipment

 }


 const updateShipmentInDB = async(user :RequestUser,shipmentId:string,payload:IUpdateShipmentPayload)=>{

  const shipment = await prisma.shipment.findFirst({
    where : {
      id : shipmentId,
      deletedAt:null
    }
  });

  if(!shipment){
    throw new Error("Shipment Not Found")
  }

  if (user.role === 'CUSTOMER') {
    const customer = await prisma.customer.findUnique({ where: { userId: user.userId } });
    if (!customer || shipment.customerId !== customer.id) {
      throw new Error('UnAuthorized Access');
    }
  }

  if (!['ORDER_PLACED', 'PAYMENT_PENDING', 'PAID'].includes(shipment.status)) {
    throw new Error('Data Cannot Change During The Shipment');
  }

  return await prisma.shipment.update({
    where : {
      id :shipmentId
    },
    data: payload
  })



 }


 const cancelShipmentInDB = async(user :RequestUser,shipmentId:string)=>{
  const shipment = await prisma.shipment.findFirst({
    where : {
      id : shipmentId,
      deletedAt: null
    }
  });

  if(!shipment){
    throw new Error("Shipment Not Found");
  }

  if(user.role === "CUSTOMER"){
    const customer = await prisma.customer.findUnique({
      where : {userId: user.userId}
    });
    if(!customer || shipment.customerId === customer.id){
      throw new Error("Unauthorized Access")
    }
  }


  if (!['ORDER_PLACED', 'PAYMENT_PENDING', 'PAID'].includes(shipment.status)) {
    throw new Error(`This Parcel Is '${shipment.status}' In Condition, You Cannot Cancel It।`);
  }


  return await prisma.$transaction(async(tx)=>{
    const updated = await tx.shipment.update({
      where : {id :shipmentId},
      data : {status: 'CANCELLED'}
    });

    await tx.shipmentLog.create({
      data : {
        shipmentId,
        fromStatus:shipment.status,
        toStatus: 'CANCELLED',
        performedById:user.userId,
        remarks : 'Customer Cancel The Parcel By His Own'
      }
    });
    return updated
  })
 }



 const softDeleteShipmentInDB = async(user :RequestUser,shipmentId:string)=>{


   const shipment = await prisma.shipment.findFirst({
    where : {
      id : shipmentId,
      deletedAt: null
    }
  });

  if(!shipment){
    throw new Error("Shipment Not Found");
  }

   if (!['ORDER_PLACED', 'PAYMENT_PENDING', 'PAID'].includes(shipment.status)) {
    throw new Error(`This Parcel Is '${shipment.status}' In Condition, You Cannot Cancel It।`);
  }

  await prisma.shipment.update({
    where : {id :shipmentId},
    data : {
      deletedAt: new Date()
    }
  });
  return null

 }


 const assignCourierToShipmentInDB = async(
  adminUser : RequestUser,
  shipmentId:string,
  courierUserId: string
 )=>{

  const shipment = await prisma.shipment.findFirst({
    where : {
      id : shipmentId, deletedAt: null
    },
    include: {
      originHub: true,
      destinationHub: true
    }
  });
  if(!shipment){
    throw new Error("Parcel Not Found");
  }

  if(shipment.status !== "PAID"){
    throw new Error(`Only PAID Parcel Can Be Assigned Properly, Current Status : ${shipment.status}`)
  }

  const courier = await prisma.user.findFirst({
    where : {
      id : courierUserId,
      role:"COURIER",
      status:"ACTIVE",
      deletedAt:null
    },
    include: {courierProfile: true}
  });

  if(!courier || !courier.courierProfile){
    throw new Error("Active Courier Profile Not Found")
  }

  if(!courier.courierProfile.isAvailable){
    throw new Error(`Courier ${courier.name} Is Not In Duty`)
  }

 return await prisma.$transaction(async (tx) => {
  
    const updatedShipment = await tx.shipment.update({
      where: {
        id: shipmentId,
        version: shipment.version, 
      },
      data: {
        courierId: courier.id,
        status: 'PICKUP_ASSIGNED',
        version: { increment: 1 },
      },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            courierProfile: {
              select: {
                vehicleType: true,
                vehicleNumber: true,
                currentZone: true,
              },
            },
          },
        },
      },
    });


    await tx.courierProfile.update({
      where : {userId : courier.id},
      data: {
        activeDeliveries: {increment : 1}
      }
    });

    await tx.shipmentLog.create({
      data : {
        shipmentId:shipment.id,
        fromStatus:"PAID",
        toStatus: "PICKUP_ASSIGNED",
        performedById:adminUser.userId,
        remarks:`Courier has Been Given The Duty Of '${courier.name} By Admin'`

      }
    });

    return updatedShipment

 })



}


export const shipmentService = {
    calculateShipmentPriceFromDB,
    createShipmentIntoDB,
    getAllShipmentsFromDB,
    getShipmentByIdFromDB,
    updateShipmentInDB,
    cancelShipmentInDB,
    softDeleteShipmentInDB,
    assignCourierToShipmentInDB
}