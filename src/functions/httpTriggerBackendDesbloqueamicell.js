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
            const id = request.query.get('id');
            const tab = request.query.get('tab');
            switch (request.method) {
                case "GET":                                       
                    const responseGet = await getItem(connection, tab,  id);
                    context.res = {
                        body: JSON.stringify(responseGet),
                    };
                    break;
                
                case "POST":                    
                    const requestDataPost = JSON.parse(await request.text());
                    if (requestDataPost) {
                        const resultInsert = await saveData(connection, requestDataPost, tab);
                        context.res = {                            
                            body: {id: resultInsert.insertId},
                            statusCode: 200,
                        };
                    } else {
                        context.res = {                        
                            body: 'Revise el Cuerpo del Post',
                            statusCode: 500,
                        };
                    }                    

                    break;

                    case "PUT":                    
                        const requestDataPut = JSON.parse(await request.text());
                        if (requestDataPut) {
                            const resultUpdate = await updateData(connection, requestDataPut, tab);
                            context.log(resultUpdate);
                            context.res = {                            
                                body: resultUpdate,
                                statusCode: 200,
                            };
                        } else {
                            context.res = {                        
                                body: 'Revise el Cuerpo del PUT',
                                statusCode: 500,
                            };
                        }                    

                        break;    
            
                default:
                    context.res = {
                        status: 405,
                    };
                    throw new Error(`Unsupported HTTP method: "${req.method}"`);
            }
            await connection.end();
            return context.res;
        } catch (error) {
            context.error(`Error: ${error.message}`);
            context.res = {
                status: 400,
                body: `Error: ${error.message}`,
            };
            return context.res;
        }        
    }
});

async function getItem(connection, tableName, id) {
    try {
        if (id === undefined || id === null) {            
            query = `SELECT * FROM ${tableName}`;
            params = [];
        } else {            
            query = `SELECT * FROM ${tableName} WHERE id = ?`;
            params = [id];
        }
      
        const results = await connection.query(query, params);
        return results;
    } catch (error) {
        throw error;
    }
}

async function saveData(connection, values, tableName) {
    const insertQuery = await buildInsertCommandFromJSON(tableName, values);    
    const valuesArray = Object.values(values);    
    return new Promise((resolve, reject) => {
        connection.query(insertQuery, valuesArray, (err, results) => {
            if (err) {
                console.error('Error al ejecutar la consulta SQL:', err);
                reject(err);
            } else {
                console.log(`insertado con exito: ${JSON.stringify(values)}`);
                resolve(results);
            }
        });
    });
}

async function updateData(connection, values, tableName) {    
    const updateCommand = await buildUpdateCommandFromJSON(tableName, values);
    console.log(updateCommand);
    const { id, ...updateValues } = values;  // Excluye el 'id' de los campos a actualizar
    let valuesArray = Object.values(updateValues);
    valuesArray.push(values.id);    
     
    console.log(valuesArray);
    return new Promise((resolve, reject) => {
        connection.query(updateCommand, valuesArray, (err, results) => {
            if (err) {
                console.error('Error al ejecutar la consulta SQL de actualización:', err);
                reject(err);
            } else {
                console.log(`Actualizado con exito: ${JSON.stringify(values)}`);
                resolve(results);
            }
        });
    });
}

const buildUpdateCommandFromJSON = async (tableName, values) => {
    const { id, ...updateValues } = values;  // Excluye el 'id' de los campos a actualizar
    const columns = Object.keys(updateValues);
    const updateCommands = columns.map((column) => `${column} = ?`).join(', ');
    return `UPDATE ${tableName} SET ${updateCommands} WHERE id = ?`;
};

const buildInsertCommandFromJSON = async (tableName, values) => {
    const columns = Object.keys(values);
    const columnNames = columns.join(', ');
    const valuePlaceholders = columns.map(() => '?').join(', ');
  
    return `INSERT INTO ${tableName} (${columnNames}) VALUES (${valuePlaceholders})`;
}
  

const getTableColumns = async (connection, tableName) => {
    const query = `SELECT COLUMN_NAME FROM information_schema.columns WHERE COLUMN_NAME <> 'id' and  TABLE_NAME = ?`;
    const results = await connection.query(query, [tableName]);
    return results.map((row) => row.COLUMN_NAME);
};

const buildInsertCommand = async (tableName, columns) => {
    const columnNames = columns.join(', ');
    const valuePlaceholders = columns.map(() => '?').join(', ');
    return `INSERT INTO ${tableName} (${columnNames}) VALUES (${valuePlaceholders})`;
};
