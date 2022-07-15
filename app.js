var express = require('express')
var mysql = require('mysql2');
var myconn = require('express-myconnection')
var cors = require('cors')
const path = require('path')
const morgan = require('morgan')
/* modulos que utilizamos en el servidor */



const app = express()
app.use(express.json())

/* Inicialiazamos nuestras constantes */


app.use(myconn(mysql, {
    host:'127.0.0.1',
    database:'red_social',
    user:'advo',
    password:'qwerty1217.',
    charset: 'utf8mb4' 

}))

/* Abrimos la conexion con la base de datos en mysql */

app.use(cors())
app.use(express.static(path.join(__dirname, 'dbimages')))
app.use(express.static(path.join(__dirname, 'profileimgs')))
app.use(express.static(path.join(__dirname, 'gameimg')))

/* Creamos las policy cors de nuestro servidor */


// Middleware


app.use(morgan('dev'))


app.use(require('./routes/routes'))


/* Importamos las rutas de nuestro servidor */



app.listen(9648, () => {
    console.log('Servidor Corriendo en el puerto 9648, localhost')
})




