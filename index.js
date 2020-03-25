'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const axios = require('axios');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  function leCardapio(agent) {
	const url= 'https://sheet.best/api/sheets/9e285308-e104-4a51-9968-6bfd70d44ea2';
    let menu = '';
    return axios
    	.get(url)
    	.then((res) => {
      		res.data.map(cardapio => {
             menu += `Codigo: ${cardapio.Codigo} - ${cardapio.Nome} (R$ ${cardapio.Preco})\n`;
            });
	       agent.add(menu);
    	})
    	.catch(err => console.log(err));
  }
  
  function gravaPedido(agent) {
    const url= 'https://sheet.best/api/sheets/9e285308-e104-4a51-9968-6bfd70d44ea2/tabs/Pedidos';
    const { quantidade, nome, cod_produto, obs, metodo_pagamento } = agent.parameters;
    let zap = request.body.queryResult.outputContexts[0].parameters.twilio_sender_id;
	zap = zap.split(':')[1];
                
    return axios
    	.post(url, [{
        	Codigo: Math.floor(Math.random() * 10000) + 1,
          	Whatsapp: zap,
          	Nome: nome,
          	CodProduto: cod_produto,
          	Quantidade: quantidade,
          	Obs: obs,
          	MetodoPagamento: metodo_pagamento,
          	Status: 'Pedido Realizado'
        }])
    	.then((res) => {
      			let num = res.data[0].Codigo;
    		   	agent.add(`Pedido realizado com sucesso. Seu número é o ${num}, utilize este número para consultar o status do seu pedido dizendo "qual o status do meu pedido?".`); 
    	})
    	.catch(err => console.log(err));
  }
  
  function leStatus(agent) {
    const { codigo_pedido } = agent.parameters;
    const url= `https://sheet.best/api/sheets/9e285308-e104-4a51-9968-6bfd70d44ea2/tabs/Pedidos/Codigo/${codigo_pedido}`;

    return axios
    	.get(url)
    	.then((pedido) => {
      		const status = pedido.data[0].Status;
    		agent.add(`O status do seu pedido é: ${status}`); 
    	})
    	.catch(err => console.log(err));
   	
  }

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Cardapio', leCardapio);
  intentMap.set('Pedido', gravaPedido);
  intentMap.set('Status', leStatus);
  agent.handleRequest(intentMap);
});
