import dotenv from 'dotenv'
dotenv.config()
import connectDB from "./db/connect_DB.js";
import {app} from './app.js';
const port = process.env.PORT || 8000;

connectDB()
.then(() => {
    app.listen(port, () => {
        console.log(`Appliaction is sreving on port ${port}`);
    })
})
.catch((err) => {
    console.log("Mongodb Connection failed : ", err);
})

