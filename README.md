# API PARA APP DESBLOQUEATUCELL
## url y Metodos:
### CRUD
    GET  https://desbloqueamicell.azure-api.net/backend/httpTriggerBackendDesbloqueamicell?tab=[NOMBRE-TABLA-BD]

    GET  https://desbloqueamicell.azure-api.net/backend/httpTriggerBackendDesbloqueamicell?tab=[NOMBRE-TABLA-BD]&valor=[VALOR-REGISTRO]&field=[NOMBRE_CAMPO_DE_LA_TABLA]

    POST https://desbloqueamicell.azure-api.net/backend/httpTriggerBackendDesbloqueamicell?tab=[NOMBRE-TABLA-BD]
        {
            id: number,
            name: string,
            drSimID: string
        }

    PUT https://desbloqueamicell.azure-api.net/backend/httpTriggerBackendDesbloqueamicell?tab=[NOMBRE-TABLA-BD]
        {
            id: number,
            name: string,
            drSimID: string
        }

    PUT https://desbloqueamicell.azure-api.net/backend/httpTriggerBackendDesbloqueamicell
        {
            "migrar": "ALL"
        }    

### DRSIM - STRIPE: PAGAR
    POST https://desbloqueamicell.azure-api.net/backend/httpTriggerBackendDesbloqueamicell?endpoint=create-checkout-session
        { 
            urlDomain: string, 
            id_terminal: number, 
            id_operador: number, 
            id_service: number, 
            imei: number, 
            email: string 
        }
    POST https://desbloqueamicell.azure-api.net/backend/httpTriggerBackendDesbloqueamicell?endpoint=InitializeHelcimPay
        { 
            precio: number, 
        }     