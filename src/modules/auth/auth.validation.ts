import z from "zod";

export const customerRegistrationZodSchema = z.object({
  name: z.string().min(3, "Name Must Atleast 3 Characters long"),

  email: z.email("Not Email"),

  password: z
    .string()
    .min(8, "Password Must Minimum 8 Characters Long ")
    .regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
    .regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")
    .regex(/[0-9]/, "Password must contain atleast 1 Number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain atleast 1 Special Character"),

    customer : z.object({
       district : z.string().optional()
    }).optional()
});



const loginZodSchema = z.object({
    email : z.email(),
    password : z.string()
                   .min(8, "Password Must Minimum 8 Characters Long")
                   .regex(/[a-z]/, "Password must contain at least 1 Number")
                    .regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")
                  .regex(/[0-9]/,"Password must contain atleast 1 Number")
                  .regex(/[^a-zA-Z0-9]/,"Password must contain atleast 1 Special Character"),
})

export const authValidation = {
  customerRegistrationZodSchema,
  loginZodSchema
};