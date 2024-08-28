import express from 'express';
import authRoutes from './routes/AuthRoutes';

 import swaggerUi  from 'swagger-ui-express';

 import swaggerDocument from './swagger.json';



const app = express()
app.use(express.json());


//middlewares

app.use(express.urlencoded({extended: true}))

app.get('/', (req, res) => {
    res.send('Test')
})

 app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


app.use('/', authRoutes);



const port = 5000;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

