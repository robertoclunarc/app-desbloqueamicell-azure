const { app } = require('@azure/functions');
const mysql = require('promise-mysql');

app.http('httpTriggerBackendDesbloqueamicell', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url: "${request.url}"`);
        const rutaAlArchivo = './DigiCertGlobalRootCA.crt.pem';        

        //const name = request.query.get('name') || await request.text() || 'world';

        try {
            const connection = await mysql.createPool({
                host: 'serverchatbotmysql.mysql.database.azure.com',
                user: 'adminchatbot',
                password: 'd9AMmyVBS9fdXP',
                database: 'azuredbchatbot',
                ssl: {ca: `${rutaAlArchivo}`,
                        rejectUnauthorized: false,
                    },
            });

            switch (request.method) {
                case "GET":
                    const id = request.query.get('id');
                    const tab = request.query.get('tab');                   
                    const responseGet = await getItem(connection, tab,  id);
                    context.res = {
                        body: JSON.stringify(responseGet),
                    };
                    break;
            
                default:
                    context.res = {
                        status: 405,
                    };
                    throw new Error(`Unsupported HTTP method: "${req.method}"`);
            }
            await connection.end();
        } catch (error) {
            context.error(`Error en la conexión a la base de datos: ${error.message}`);
            context.res = {
                status: 400,
                body: `Error en la conexión a la base de datos: ${error.message}`,
            };
        }

        return context.res;
    }
});

async function getItem(connection, tab, id) {
    try {
        console.log(id);
        if (id === undefined || id === null) {            
            query = `SELECT * FROM ${tab}`;
            params = [];
        } else {            
            query = `SELECT * FROM ${tab} WHERE id = ?`;
            params = [id];
        }
      
        const results = await connection.query(query, params);
        return results;
    } catch (error) {
        throw error;
    }
}
