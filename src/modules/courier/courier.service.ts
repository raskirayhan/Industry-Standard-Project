import { uploadToCloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middlewares/auth";
import { ICreateCourierProfilePayload } from "./courier.interface";

const createOrUpdateCourierProfile = async(
    user:RequestUser,
    payload:ICreateCourierProfilePayload,
    files?: { [fieldname: string]: Express.Multer.File[] }

)=>{
    if (!payload || !payload.hubId) {
        throw new Error("hubId is required to setup courier profile");
    }

    const existingUser = await prisma.user.findFirst({
        where : {id: user.userId,deletedAt:null},
        include: {courierProfile: true}
    });

    if(!existingUser || existingUser.role !== "COURIER"){
        throw new Error("Only Courier Can Be Created In the Courier Profile")
    }


    const hub = await prisma.hub.findFirst({
        where : {
            id : payload.hubId,
            deletedAt: null
        }
    });

    if(!hub){
        throw new Error("The Selected Hub Is Not Found")
    }

    let drivingLicenseUrl = existingUser.courierProfile?.drivingLicenseUrl || null;
    let nidCardUrl = existingUser.courierProfile?.nidCardUrl || null

    if(files?.drivingLicense?.[0]){
        const licenseUpload = await uploadToCloudinary(files.drivingLicense[0].buffer,
        'courier_documents/licenses');
        drivingLicenseUrl = licenseUpload.secure_url
    }



    if(files?.nidCard?.[0]){
        const nidUpload = await uploadToCloudinary(
            files.nidCard[0].buffer,
            'courier_documents/nids'
        );
        nidCardUrl = nidUpload.secure_url
    };



    const profile = await prisma.courierProfile.upsert({
        where : {userId: user.userId},
        update: {
            hubId:payload.hubId,
            vehicleType: payload.vehicleType,
            vehicleNumber: payload.vehicleNumber,
            drivingLicense:payload.drivingLicense || null,
            drivingLicenseUrl,
            nidCardUrl,
            currentZone:payload.currentZone,
            maxCapacityKg:payload.maxCapacityKg ? Number(payload.maxCapacityKg) : 30.0,
        },

        create: {
      userId: user.userId,
      hubId: payload.hubId,
      vehicleType: payload.vehicleType,
      vehicleNumber: payload.vehicleNumber,
      drivingLicense: payload.drivingLicense || null,
      drivingLicenseUrl,
      nidCardUrl,
      currentZone: payload.currentZone,
      maxCapacityKg: payload.maxCapacityKg ? Number(payload.maxCapacityKg) : 30.0,
    },
    include: {
      hub: { select: { id: true, name: true, code: true, zone: true } },
    },
    });
    return profile;
}


const getMyCourierProfile = async(userId: string) =>{
    const profile = await prisma.courierProfile.findUnique({
        where : {
            userId
        },
        include: {
            hub:true,
            user:{
                select: {
                    id:true,
                    name:true,
                    email:true,
                    phone:true,
                    status:true
                }
            }
        }
    });

    if(!profile){
        throw new Error("Courier Profile Didn't Created Yet")
    }
    return profile
}

export const courierService = {
    createOrUpdateCourierProfile,
    getMyCourierProfile
}