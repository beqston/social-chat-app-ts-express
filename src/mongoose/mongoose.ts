import mongoose from "mongoose";

export default async function connectDB(url:string | undefined) {
    try {
        if(url){

            await mongoose.connect(url)
            console.log('Connected DB')
        }else{
            throw new Error('You Not Have URL')
        }

    } catch (error) {
        console.log(error)
    }
}