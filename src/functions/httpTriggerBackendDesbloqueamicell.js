const { app } = require('@azure/functions');
const mysql = require('promise-mysql');
const axios = require('axios');
const Stripe = require('stripe');
const { buildUpdateCommandFromJSON, formatDateString, saveDataFromApiPaises, saveDataFromApiOperadoras, saveData, saveDataFromApiMarcas, saveDataFromApiModelos } = require('./checkExistingRecord');

const STRIPESECRETKEY = process.env.STRIPESECRETKEY;
const apiDrSimCreateOrden = process.env.apiDrSimCreateOrden;
const DSIM_KEY = process.env.DSIM_KEY;
const DRSIM_SECRET = process.env.DRSIM_SECRET;
const DBHOST = process.env.DBHOST;
const DBUSER = process.env.DBUSER;
const DBPASSW = process.env.DBPASSW;
const DBNAME = process.env.DBNAME;

const stripe = Stripe(STRIPESECRETKEY);

app.http('httpTriggerBackendDesbloqueamicell', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url: "${request.url}"`);
        const rutaAlArchivo = './DigiCertGlobalRootCA.crt.pem';        

        //const name = request.query.get('name') || await request.text() || 'world';

        try {
            const connection = await mysql.createPool({
                host: DBHOST,
                user: DBUSER,
                password: DBPASSW,
                database: DBNAME,
                ssl: {ca: `${rutaAlArchivo}`,
                        rejectUnauthorized: false,
                    },
            });
            const id = request.query.get('id');
            const tab = request.query.get('tab');
            const endPoint = request.query.get('endpoint');
            switch (request.method) {
                case "GET":
                    if (endPoint && endPoint == 'checkout'){
                        const responseCheckout = await validateCheckout(connection, id);
                        context.res = {
                            body: JSON.stringify(responseCheckout)
                        }
                    }else{
                        const responseGet = await getItem(connection, tab,  id);
                        context.res = {
                            body: JSON.stringify(responseGet),
                        };
                    }
                    break;
                
                case "POST":
                    const requestDataPost = JSON.parse(await request.text());
                    if (requestDataPost) {
                        if (endPoint && endPoint == 'create-checkout-session'){
                            const createSession = await createCheckoutSession(connection, requestDataPost);
                            console.log(createSession);
                            context.res = {                            
                                body: JSON.stringify(createSession),
                                statusCode: 200,
                            };
                        } else {
                            const resultInsert = await saveData(connection, requestDataPost, tab);
                            context.res = {                            
                                body: {id: resultInsert.insertId},
                                statusCode: 200,
                            };
                        }    
                    } else {
                        context.res = {                        
                            body: 'Revise el Cuerpo del Post',
                            statusCode: 500,
                        };
                    }                    

                    break;

                    case "PUT":                    
                        const requestDataPut = JSON.parse(await request.text());
                        if (requestDataPut && tab) {
                            const resultUpdate = await updateData(connection, requestDataPut, tab);
                            context.log(resultUpdate);
                            context.res = {                            
                                body: JSON.stringify(resultUpdate),
                                statusCode: 200,
                            };
                        } else {
                            
                            if (requestDataPut.migrar === "ALL"){
                                
                                const migrados = await saveDataFromAPI(connection);
                            }
                            
                            context.res = {                        
                                body: 'Completado!',
                                statusCode: 200,
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

async function validateCheckout(connection, sessionId){     
    const reqGetOrdenDB = await getItem(connection, 'ordenes',  sessionId)
    const ticket = reqGetOrdenDB[0];
    console.log(ticket);
    const sessionDetails = await getStripeSessionDetails(ticket?.id_session);
    //console.log(sessionDetails);
    if (ticket?.id && ticket?.id_ticket === 'none' && sessionDetails.payment_status === 'unpaid') {
        console.log('El pago se ha concretado con exito. Actualizando el estatus en la API de tickets...');
        console.log(`${apiDrSimCreateOrden}/${ticket.id_terminal}/${ticket.id_operador}/${ticket.imei}/${ticket.id_service}`);
        const urlCreateTicket = `${apiDrSimCreateOrden}/${ticket.id_terminal}/${ticket.id_operador}/${ticket.imei}/${ticket.id_service}`;
        console.log(urlCreateTicket)
        const reqDrSimCreateOrden = await sendPostRequestDRSIM(urlCreateTicket);
        //const resDrSimCreateOrden = JSON.parse(reqDrSimCreateOrden);
        console.log(reqDrSimCreateOrden);
        var nroTicket = 'none';
        if (reqDrSimCreateOrden?.res?.id_ticket){
            nroTicket = reqDrSimCreateOrden.res.id_ticket;
            console.log(`ticket creado: ${nroTicket}`);
        }
        /*
        const reqTicket = {
            id: ticket.id,
            id_ticket: nroTicket,
            date: ticket.date,
            email: ticket.email,
            imei: ticket.imei,
            id_payment: ticket.id_payment,
            price: ticket.price,
            estatus: sessionDetails.payment_status,
            id_session: ticket.id_session,
            dataComplete: ticket.dataComplete + `, ticket: ${nroTicket}`,
            id_terminal: ticket.id_terminal,
            id_operador: ticket.id_operador,
        };

        const optionsPutDynamo = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        };
        urlOrden = `https://0v8aexvf86.execute-api.us-east-1.amazonaws.com/tickets/ordenes`;
        const reqDynamoCreateOrden = await sendToDynamoBD(urlOrden, optionsPutDynamo, reqTicket);
        console.log(reqDynamoCreateOrden);
        */
        body = { message: 'Pago validado con éxito. Estatus actualizado a "paid".' };
    } else {
        console.log('Esta condicion no se cumplio: if (ticket.id && ticket.id_ticket === none && sessionDetails.payment_status === paid)');
        body = { message: 'El pago no se ha concretado con éxito.' };
    }

}

const getStripeSessionDetails = async (sessionId) => {
    const apiUrl = `https://api.stripe.com/v1/checkout/sessions/${sessionId}`;
    try {
      const response = await axios.get(apiUrl, {
        headers: {
            Authorization: `Bearer ${STRIPESECRETKEY}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('getStripeSessionDetails error:', error);
      return null;
    }
};

async function createCheckoutSession(connection, postRequest){
    const urlTool = `https://api.doctorsim.com/tools/${postRequest.id_terminal}/${postRequest.id_operador}`;
    try {
        const responseTools = await sendHttpRequestDRSIM(urlTool);
        const tools = responseTools.res.tools;
        var tool;
        var body;
        for await (const item of tools) {
            if (item.id_tool === postRequest.id_service) {
                tool = item;
                break;
            }
        }if (tool) {
            const timestamp = Date.now();
            const producto = await stripe.products.create({
                name: tool.name,
                description: tool.service_name,
            });

            const precio = await stripe.prices.create({
                product: producto.id,
                unit_amount: parseInt(tool.price * 100),
                currency: 'USD',
            });
            
            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        price: precio.id,
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${postRequest.urlDomain}/${timestamp}`,
                cancel_url: `${postRequest.urlDomain}/cancel`,
            });

            if (session.id) {                
                const hoy = await formatDateString(timestamp);
                const reqTicket = {
                    idreg: timestamp,
                    id_ticket: 'none',
                    fecha: hoy,
                    correo: postRequest.email,
                    imei: postRequest.imei,
                    id_servicio: postRequest.id_service,
                    precio: `${tool.price}`,
                    estatus: session.payment_status,
                    id_session: session.id,
                    datos_complementarios: `IMEI: ${postRequest.imei}, idService: ${postRequest.id_service}, email: ${postRequest.email}, price: ${tool.price}, date: ${hoy}`,
                    id_terminal: postRequest.id_terminal,
                    id_operador: postRequest.id_operador,
                };
                
                const reqCreateOrdenDB = await saveData(connection, reqTicket, 'ordenes_desbloqueos');
            } else {
                body = { sessionId: `${urlDomain}/cancel` };
            }
            body = { sessionId: session.url };            
        } 

        return body;

    } catch (error) {
        console.log({function: 'createCheckoutSession', error: error});
        return tool={};
    }    
}

const sendHttpRequestDRSIM = async (url) => {
    try {
      const response = await axios.get(url, {
        headers: {
            DSIM_KEY: DSIM_KEY,
            DSIM_SECRET: DRSIM_SECRET,
        },
      });

      return response.data;
    } catch (error) {
      console.error('DRSIM error:', error);
      return null;
    }
};

const sendPostRequestDRSIM = async (url, body) => {
    console.log({
                url: url,
                DSIM_KEY: DSIM_KEY,
                DSIM_SECRET: DRSIM_SECRET,
            });
    const headers = {
        DSIM_KEY: DSIM_KEY,
        DSIM_SECRET: DRSIM_SECRET
    };        
    try {
        const response = await axios.post(url, null, { headers });

        return response.data;
    } catch (error) {
      console.error('sendPostRequestDRSI error:', error);
      return null;
    }
};

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

async function saveDataFromAPI(connection) {
    const dataFromAPI = [
        {
            url: 'https://api.doctorsim.com/countries',
            tableName: 'paises',
        },
        {
            url: 'https://api.doctorsim.com/networks',
            tableName: 'operadoras',
        },
        {
            url: 'https://api.doctorsim.com/brands',
            tableName: 'marcas_celulares',
        },
        {
            url: 'https://api.doctorsim.com/devices',
            tableName: 'dispositivos_celulares',
        }
    ];
    let migrado = { paises: [], operadoras: [], marcas: [], modelos: []};
    try {
        
        for (const data of dataFromAPI) {
            let porMigrar = [];
            /*if (data.tableName === 'paises'){
                const responsePaises = await sendHttpRequestDRSIM(data.url); 
                porMigrar = await saveDataFromApiPaises(connection, data, responsePaises);
                migrado.paises = porMigrar;
            }
            if (data.tableName === 'operadoras'){
                const responseOperadoras = await sendHttpRequestDRSIM(data.url); 
                porMigrar = await saveDataFromApiOperadoras(connection, data, responseOperadoras);
                migrado.operadoras = porMigrar;
            }*/
            if (data.tableName === 'marcas_celulares'){
                const responseMarcas = await sendHttpRequestDRSIM(data.url); 
                porMigrar = await saveDataFromApiMarcas(connection, data, responseMarcas);
                migrado.marcas = porMigrar;
            }
            if (data.tableName === 'dispositivos_celulares'){
                const responseModelos = await sendHttpRequestDRSIM(data.url); 
                porMigrar = await saveDataFromApiModelos(connection, data, responseModelos);
                migrado.modelos = porMigrar;
            }
            
        }              
        return migrado;
        
    } catch (error) {
        console.error('Error en la funcion saveDataFromAPI:', error);
    }
}