// const dbInfo = require('./config')
const app=require('./app');
const connectDatabase = require('./db/Database');



//Handle uncaught exceptions
// process.on('uncaughtException', (err)=>{
//     console.log(`Error:${err.message} `);
//     console.log("Shutting down server for handling Error" );
// })

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
    require("dotenv").config({
      path: "backend/config/.env",
    });
  }
  
// connect db
connectDatabase();

// create server
const server = app.listen(process.env.PORT, () => {
  console.log(
    `Server is running on http://localhost:${process.env.PORT}`
  );
});
  

//Handle unhandled promise exceptions
process.on('unhandleRejection', (err)=>{
    console.log(`Error:${err.message} `);
    console.log("Shutting down server for un handling promise Error" );

    server.close(()=>{
        process.exit(1);
    })
})