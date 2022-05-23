const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcrypt')
const saltRounds = 10



const router = express.Router()


const diskstorage = multer.diskStorage({
    destination: path.join(__dirname, '../imagenes'),
    filename: (res, file, cb) => {
        cb(null, Date.now() + file.originalname)
    }
})

const fileUpload = multer({
    storage: diskstorage
}).single('image')

router.get('/', (req, res) => {
    res.send('Servidor Nodejs Endpoint de la base de datos')
})

/* Login */

router.post('/login', (req, res) => {

    console.log(req.body)

    const { Password, Email } = req.body
    const values = [Email]

    req.getConnection((err, conn) => {
        if (err) return res.status(500).json({
            body: {
                mensaje: "Error al leer los datos!",
                CodeStatus: 500
            }
        })
        conn.query('SELECT * FROM t_usuarios WHERE Email = ?', values, (err, result) => {

            if (err) {
                res.status(500).json({
                    body: {
                        mensaje: "Internal server error",
                        CodeStatus: 500
                    }
                })
            } else {
                if (result.length > 0) {
                    const compare = bcrypt.compareSync(Password, result[0].Password)


                    if (compare) {


                        if (!result[0].Data) {

                            const urlImg = 'http://62.42.95.238:9648/noprofilephoto.png'

                            res.status(200).json({
                                body: {
                                    Id_user: result[0].Id_user,
                                    Username: result[0].Username,
                                    Email: result[0].Email,
                                    urlImg,
                                    CodeStatus: 200
                                }
                            })

                        } else {

                            fs.writeFileSync(path.join(__dirname, '../profileimg/' + result[0].Id_user + '-shotshare.png'), result[0].Data)
                            const urlImg = 'http://62.42.95.238:9648/' + result[0].Id_user + '-shotshare.png'
                            res.status(200).json({
                                body: {
                                    Id_user: result[0].Id_user,
                                    Username: result[0].Username,
                                    Email: result[0].Email,
                                    urlImg,
                                    CodeStatus: 200
                                }
                            })

                        }


                    } else {
                        res.status(400).json({
                            body: {
                                mensaje: "Contraseña Incorrecta",
                                CodeStatus: 400
                            }
                        })

                    }


                } else {
                    res.status(400).json({
                        body: {
                            mensaje: "¡Usuario no existe!",
                            CodeStatus: 400
                        }
                    })
                }
            }
        })

    })


})

/* Registrar usuario en la base de datos */

router.post('/register', (req, res) => {

    console.log(req.body)

    const Username = req.body.Username
    const PasswordNo = req.body.Password
    const encryptedPassword = bcrypt.hashSync(PasswordNo, saltRounds)
    const Email = req.body.Email
    const Password = encryptedPassword

    if (Username === "" || Password === "" || Email === "") {
        res.status(500).json({
            body: {
                mensaje: "Error al leer los datos!",
                CodeStatus: 500
            }
        })
    } else {

        req.getConnection((err, conn) => {
            if (err) return res.status(500).json({
                body: {
                    mensaje: "Error al leer los datos!",
                    CodeStatus: 500
                }
            })
            conn.query('INSERT INTO t_usuarios set ?', [{ Username, Password, Email }], (err, rows) => {
                if (err) return res.status(500).json({
                    body: {
                        mensaje: "Usuario o Emial en uso!",
                        CodeStatus: 500
                    }
                })

                res.status(200).json({
                    body: {
                        mensaje: "Se han introducido",
                        CodeStatus: 200
                    }
                })
            })

        })

    }

})

var DataInfP

router.post('/post/inf', (req, res) => {
    DataInfP = req.body

    res.status(200).send('ok')
})

/* Subir una publicacion al servidor / falta añadir cosas como el usuario y la información sobre la publicacion */
router.post('/post/img', fileUpload, (req, res) => {



    const timeElapsed = Date.now()
    var d = new Date(timeElapsed);
    d = new Date(d.getTime() - 3000000);
    var date_format_str = d.getFullYear().toString() + "-" + ((d.getMonth() + 1).toString().length == 2 ? (d.getMonth() + 1).toString() : "0" + (d.getMonth() + 1).toString()) + "-" + (d.getDate().toString().length == 2 ? d.getDate().toString() : "0" + d.getDate().toString()) + " " + (d.getHours().toString().length == 2 ? d.getHours().toString() : "0" + d.getHours().toString()) + ":" + ((parseInt(d.getMinutes() / 5) * 5).toString().length == 2 ? (parseInt(d.getMinutes() / 5) * 5).toString() : "0" + (parseInt(d.getMinutes() / 5) * 5).toString()) + ":00";


    const Id_user = DataInfP.Id_user
    const Text = DataInfP.Text
    const CreationDate = date_format_str



    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')




        const Type = req.file.mimetype
        const Name = req.file.originalname
        var Id_post
        const Data = fs.readFileSync(path.join(__dirname, '../imagenes/' + req.file.filename))

        conn.query('INSERT INTO t_publicacion set ?', [{ Id_user, Text, CreationDate }], (err, rows) => {
            console.log('Error en publicar : ' + err)
            if (err) return res.status(500).send('Server Error')

            Id_post = rows.insertId

            conn.query('INSERT INTO t_images set ? ', [{ Id_post, Type, Name, Data }], (err, rows) => {
                console.log('Error imagen ' + err)
                if (err) return res.status(500).send('Server Error')
            })
        })


        res.status(200).send('ok')
    })


})

router.get('/get/userpublicimg', (req, res) => {

    const value = req.query.id_user
    console.log('el usuario de la peticion es: ' + value)

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('server error')

        conn.query('SELECT * FROM red_social.t_publicacion INNER JOIN red_social.t_images ON t_images.Id_post = t_publicacion.Id_post WHERE t_publicacion.Id_user =  ? ', value,
            (err, rows) => {
                if (err) return res.status(500).send('server error')
                var imagedir
                rows.map(img => {
                    fs.writeFileSync(path.join(__dirname, '../dbimages/' + img.Id_post + '-shotshare.png'), img.Data)

                    const urlImg = 'http://62.42.95.238:9648/' + img.Id_post + '-shotshare.png'

                    if (!imagedir) {

                        imagedir = [
                            {

                                Id_post: img.Id_post,
                                Id_user: img.Id_user,
                                Text: img.Text,
                                CreationDate: img.CreationDate,
                                urlImg

                            }
                        ]

                    } else {

                        imagedir.push(
                            {

                                Id_post: img.Id_post,
                                Id_user: img.Id_user,
                                Text: img.Text,
                                CreationDate: img.CreationDate,
                                urlImg

                            })

                    }


                })

                res.json(imagedir)

            })
    })
})


router.get('/get/follows', (req, res) => {

    const Id_user = req.query.id_user
    const Id_segid = req.query.id_user

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')

        var imagedir
        var outRow1
        var outRow2
        const sql1 = 'SELECT COUNT(t_seguidor.Id_segid) AS Siguiendo FROM t_seguidor WHERE  t_seguidor.Id_user like ? '
        const sql2 = 'SELECT COUNT(t_seguidor.Id_user) AS Seguidores FROM t_seguidor WHERE  t_seguidor.Id_segid like ? '

        conn.query(sql1, [Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')
            outRow1 = rows[0].Siguiendo
            conn.query(sql2, [Id_segid ], (err, rows) => {
                if (err) return res.status(500).send('Server Error')
                outRow2 = rows[0].Seguidores
                imagedir = [{
                    Siguiendo: outRow1,
                    Seguidores: outRow2
                }]


                res.json(imagedir)
            })
        })




    })


})
router.delete('/delete/public', (req, res) => {

    const Id_post = req.query.id_post

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')
        const sql1 = 'DELETE t_publicacion, t_images FROM t_publicacion INNER JOIN t_images ON t_images.Id_post = t_publicacion.Id_post WHERE t_publicacion.Id_post = ? '

        conn.query(sql1, [Id_post], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

            fs.unlinkSync(path.join(__dirname, '../dbimages/' + Id_post + '-shotshare.png'))

            res.send('image deleted')
        })




    })


})


module.exports = router
