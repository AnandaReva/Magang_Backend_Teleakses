import express from 'express';
import { PrismaClient } from '@prisma/client';


import authRoutes from './routes/AuthRoutes';

import swaggerUi  from 'swagger-ui-express';

import swaggerDocument from './swagger.json';



const prisma = new PrismaClient();
const app = express()
app.use(express.json());



app.use(express.urlencoded({extended: true}))

app.get('/', async (req, res) => {
    try {
        await prisma.$connect();
        res.send('Terhubung ke database');
    } catch (error) {
        console.error('Tidak dapat terhubung ke database:', error);
        res.status(500).send('Tidak dapat terhubung ke database');
    } finally {
        await prisma.$disconnect();
    }
});


 app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


app.use('/', authRoutes);



const port = 5000;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

