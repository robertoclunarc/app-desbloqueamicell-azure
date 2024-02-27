async function checkExistingRecord(connection, tableName, drSimID, nombre) {
    try {
        const query = `SELECT id FROM ${tableName} WHERE drSimID = ? AND nombre = ?`;
        const result = await connection.query(query, [drSimID, nombre]);
        return result.length > 0;
    } catch (error) {
        console.error('Error al verificar el registro existente:', error);
        return false;
    }
}

const buildUpdateCommandFromJSON = async (tableName, values) => {
    const { id, ...updateValues } = values;  // Excluye el 'id' de los campos a actualizar
    const columns = Object.keys(updateValues);
    const updateCommands = columns.map((column) => `${column} = ?`).join(', ');
    return `UPDATE ${tableName} SET ${updateCommands} WHERE id = ?`;
};

async function formatDateString(dateString) {
    const date = new Date(dateString); // Crea un objeto Date a partir del string de fecha
    const year = date.getFullYear(); // Obtiene el año (cuatro dígitos)
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Obtiene el mes (de 0 a 11)
    const day = date.getDate().toString().padStart(2, '0'); // Obtiene el día del mes
    const hours = date.getHours().toString().padStart(2, '0'); // Obtiene las horas
    const minutes = date.getMinutes().toString().padStart(2, '0'); // Obtiene los minutos
    const seconds = date.getSeconds().toString().padStart(2, '0'); // Obtiene los segundos

    // Formatea la fecha en el formato deseado
    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    return formattedDate;
}

async function saveDataFromApiPaises(connection, apis, dataFromAPI) {
    try {       
        let paises = [];
        if (dataFromAPI) {
            // Iterar sobre los datos obtenidos del API
            for (const id in dataFromAPI.res) {
                let nombrePais;
                if (Object.hasOwnProperty.call(dataFromAPI.res, id)) {                    
                    nombrePais = dataFromAPI.res[id];                    
                   
                    // Verificar si el registro ya existe en la base de datos
                    const existingRecord = await checkExistingRecord(connection, apis.tableName, id, nombrePais);
                    let data = { nombre: nombrePais, drSimID: id };
                    if (!existingRecord) {                                                        
                        // Si el registro no existe, guardarlo en la base de datos
                        paises.push(data);
                        console.log(`Registro por insertar en la base de datos>> ${apis.tableName}: ${JSON.stringify(data)}`);
                        await saveData(connection, data, apis.tableName);
                    }else{
                        console.log(`Registro ya existe en la base de datos>> ${apis.tableName}: ${JSON.stringify(data)}`);
                    }
                }     
            }
            return paises;
        } else {
            console.error(`No se pudieron obtener datos del API: ${apis.url}`);
        }
    } catch (error) {
        console.error('Error al guardar datos desde el API:', error);
    }
}

async function saveDataFromApiOperadoras(connection, apis, dataFromApi) {
    try {  
        let operadoras = [];
        if (dataFromApi) {
            // Iterar sobre los datos obtenidos del API
            for (const countryId in dataFromApi.res) {
                if (Object.hasOwnProperty.call(dataFromApi.res, countryId)) {
                    const networks = dataFromApi.res[countryId];
                    for (const networkId in networks) {
                        if (Object.hasOwnProperty.call(networks, networkId)) {
                            const networkName = networks[networkId];
                            console.log(`País ID: ${countryId}, Operadora ID: ${networkId}, Nombre Operadora: ${networkName}`);
                            // Verificar si el registro ya existe en la base de datos
                            const existingRecord = await checkExistingRecord(connection, apis.tableName, networkId, networkName);
                            let data = { nombre: networkName, drSimID: networkId, paisesDrSimID: countryId };
                            if (!existingRecord) {                                                               
                                // Si el registro no existe, guardarlo en la base de datos
                                operadoras.push(data);                                
                                console.log(`Registro por insertar en la base de datos>> ${apis.tableName}: ${JSON.stringify(data)}`);
                                await saveData(connection, data, apis.tableName);
                            }else{
                                console.log(`Registro ya existe en la base de datos>> ${apis.tableName}: ${JSON.stringify(data)}`);
                            }
                        }
                    }
                }       
            }
            return operadoras;
        } else {
            console.error(`No se pudieron obtener datos del API: ${apis.url}`);
        }
    } catch (error) {
        console.error('Error en la funcion saveDataFromApiOperadoras:', error);
    }
}

async function saveDataFromApiMarcas(connection, apis, dataFromApi) {
    try {  
        let marcas = [];
        if (dataFromApi) {
            // Iterar sobre los datos obtenidos del API
            for (const brandId in dataFromApi.res) {
                if (Object.hasOwnProperty.call(dataFromApi.res, brandId)) {
                    const brandData = dataFromApi.res[brandId];
                    const brandName = brandData.brand;
                    const brandDesc = brandData.desc;
                    console.log(`IDMarca: ${brandId}, NombreMarca: ${brandName}, Descripcion: ${brandDesc}`);                            
                    // Verificar si el registro ya existe en la base de datos
                    const existingRecord = await checkExistingRecord(connection, apis.tableName, brandId, brandName);
                    let data = { nombre: brandName, drSimID: brandId, descripcion: brandDesc };
                    if (!existingRecord) {                                                               
                        // Si el registro no existe, guardarlo en la base de datos
                        marcas.push(data);                                
                        console.log(`Registro por insertar en la base de datos>> ${apis.tableName}: ${JSON.stringify(data)}`);
                        await saveData(connection, data, apis.tableName);
                    }else{
                        console.log(`Registro ya existe en la base de datos>> ${apis.tableName}: ${JSON.stringify(data)}`);
                    }                    
                }       
            }
            return marcas;
        } else {
            console.error(`No se pudieron obtener datos del API: ${apis.url}`);
        }
    } catch (error) {
        console.error('Error en la funcion saveDataFromApiMarcas:', error);
    }
}

async function saveDataFromApiModelos(connection, apis, dataFromApi) {
    try {  
        let modelos = [];
        if (dataFromApi) {
            // Iterar sobre los datos obtenidos del API
            for (const brandId in dataFromApi.res) {
                if (Object.hasOwnProperty.call(dataFromApi.res, brandId)) {
                    const deviceData = dataFromApi.res[brandId];
                    for (const modelId in deviceData) {
                        if (Object.hasOwnProperty.call(deviceData, modelId)) {
                            const modelData = deviceData[modelId];
                            const deviceName = modelData.name;
                            const deviceImg = modelData.img;
                            const deviceDesc = modelData.desc;
                            console.log(`IDMarca: ${brandId}, IDModelo: ${modelId}, NombreDispositivo: ${deviceName}, Imagen: ${deviceImg}, Descripcion: ${deviceDesc}`);                           
                            // Verificar si el registro ya existe en la base de datos
                            const existingRecord = await checkExistingRecord(connection, apis.tableName, modelId, deviceName);
                            let data = { nombre: deviceName, drSimID: modelId, descripcion: deviceDesc, imagen: deviceImg, marcasDrSimID: brandId };
                            if (!existingRecord) {                                                               
                                // Si el registro no existe, guardarlo en la base de datos
                                modelos.push(data);
                                console.log(`Registro por insertar en la base de datos>> ${apis.tableName}: ${JSON.stringify(data)}`);
                                await saveData(connection, data, apis.tableName);
                            }else{
                                console.log(`Registro ya existe en la base de datos>> ${apis.tableName}: ${JSON.stringify(data)}`);
                            }
                        }    
                    }
                }       
            }
            return modelos;
        } else {
            console.error(`No se pudieron obtener datos del API: ${apis.url}`);
        }
    } catch (error) {
        console.error('Error en la funcion saveDataFromApiModelos:', error);
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

const getTableColumns = async (connection, tableName) => {
    const query = `SELECT COLUMN_NAME FROM information_schema.columns WHERE COLUMN_NAME <> 'id' and  TABLE_NAME = ?`;
    const results = await connection.query(query, [tableName]);
    return results.map((row) => row.COLUMN_NAME);
};

const buildInsertCommandFromJSON = async (tableName, values) => {
    const columns = Object.keys(values);
    const columnNames = columns.join(', ');
    const valuePlaceholders = columns.map(() => '?').join(', ');
  
    return `INSERT INTO ${tableName} (${columnNames}) VALUES (${valuePlaceholders})`;
}


module.exports = { checkExistingRecord, buildUpdateCommandFromJSON, formatDateString, saveDataFromApiPaises, saveDataFromApiOperadoras, saveData, saveDataFromApiMarcas, saveDataFromApiModelos };