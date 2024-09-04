import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import reportRoutes from './routes/reportRoutes'; 
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';
import checkJsonMiddleware from './middlewares/checkJsonMiddleware'
import checkIpMiddleware from './middlewares/checkIpMiddleware';

const app = express();

dotenv.config();
// middlewares
app.use(checkIpMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(checkJsonMiddleware);

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});

app.get('/', async (req, res) => {
    const client = await pool.connect();

    try {
        // Use the client to run a simple query to verify the connection
        await client.query('SELECT NOW()');
        res.send('Connected to database');
    } catch (e) {
        console.error('Cannot connect to database:', e);
        res.status(500).send('Cannot connect to database');
    } finally {
        // Release the client back to the pool
        client.release();
    }
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/', reportRoutes)


const port = 5000;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
