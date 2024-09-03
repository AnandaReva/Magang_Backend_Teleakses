import express from 'express';
import { PrismaClient } from '@prisma/client';
import reportRoutes from './routes/reportRoutes'; 
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';
import checkJsonMiddleware from './middlewares/checkJsonMiddleware'
import checkIpMiddleware from './middlewares/checkIpMiddleware';
const prisma = new PrismaClient();
const app = express();
// middlewares
app.use(checkIpMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(checkJsonMiddleware);

app.get('/', async (req, res) => {
    try {
        await prisma.$connect();
        res.send('Connected to database');
    } catch (e) {
        console.error('Cannot connect to database:', e);
        res.status(500).send('Cannot connect to database');
    } finally {
        await prisma.$disconnect();
    }
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/', reportRoutes)


const port = 5000;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
