import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';
import pool from './db/config';
import checkJsonMiddleware from './middlewares/checkJsonMiddleware'
import checkIpMiddleware from './middlewares/logRequestMiddleware';
const app = express();

dotenv.config();
// middlewares

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(checkIpMiddleware);
app.use(checkJsonMiddleware);


app.get('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('SELECT NOW()');
        res.send('Request received');
        console.error(' Connected to database');
    } catch (e) {
        console.error('Cannot connect to database:', e);
        res.status(500).send('something went wrong');
    } finally {
        client.release();
    }
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/', authRoutes);


const port = 5000;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
