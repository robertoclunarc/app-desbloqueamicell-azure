const { app } = require('@azure/functions');
const mysql = require('promise-mysql');

app.http('httpTriggerBackendDesbloqueamicell', {
    methods: ['GET', 'POST', 'PUT', DELETE],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        const rutaAlArchivo = './DigiCertGlobalRootCA.crt.pem';
        const connection = await mysql.createPool({
            host: 'serverchatbotmysql.mysql.database.azure.com',
            user: 'adminchatbot',
            password: 'd9AMmyVBS9fdXP',
            database: 'azuredbchatbot',
            ssl: {ca: `${rutaAlArchivo}`,
                    rejectUnauthorized: false,
                },
        });
        //const name = request.query.get('name') || await request.text() || 'world';
        try {

            switch (request.method) {
                case "DELETE":
                  await deleteItem(connection, request.params.id);
                  body = `Deleted item ${req.params.id}`;
                  break;
                case "GET":
                    const id = request.query.get('id');
                    context.log(id);
                    context.log(request.params.name);
                    body = await getItem(connection, id);
                    break;
                case "PUT":
                    let requestJSON = req.body;
                    let items = Array.isArray(requestJSON) ? requestJSON : [requestJSON];
                    await putItems(connection,items);
                    body = "Put items";
                    break;
                default:
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

async function deleteItem(connection, id) {
    try {
        await connection.query("DELETE FROM contries_bd_desblo WHERE id = ?", [id]);
    } finally {
        connection.release();
    }
}
  
async function getItem(connection, id) {
    try {
        if (id === undefined) {            
            query = "SELECT * FROM contries_bd_desblo";
            params = [];
        } else {            
            query = "SELECT * FROM contries_bd_desblo WHERE id = ?";
            params = [id];
        }
      
        const [results] = await connection.query(query, params);
        return results;
    } finally {
        connection.release();
    }
}
  
async function putItems(connection, items) {
    try {
        for (let item of items) {
        await connection.query(
            "INSERT INTO contries_bd_desblo (id, name, drSimID) VALUES (?, ?, ?)",
            [item.id, item.name, item.expirationTime, item.drSimID]
        );
        }
    } finally {
        connection.release();
    }
}