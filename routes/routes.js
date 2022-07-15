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

                            const urlImg = 'http://127.0.0.1:9648/noprofilephoto.png'

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

                            fs.writeFileSync(path.join(__dirname, '../profileimgs/' + result[0].Id_user + '-Perfshotshare.png'), result[0].Data)
                            const urlImg = 'http://127.0.0.1:9648/' + result[0].Id_user + '-Perfshotshare.png'
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



/* Subir una publicacion al servidor / falta añadir cosas como el usuario y la información sobre la publicacion */
router.post('/post/img', fileUpload, (req, res) => {



    var d = new Date();
    var dformat = [d.getFullYear(),
    ((d.getMonth() + 1).toString().length == 2 ? (d.getMonth() + 1).toString() : "0" + (d.getMonth() + 1).toString()),
    (d.getDate().toString().length == 2 ? d.getDate().toString() : "0" + d.getDate().toString())].join('-') + ' ' +
        [d.getHours(),
        d.getMinutes(),
        d.getSeconds()].join(':');
    const CreationDate = dformat

    const Id_user = req.query.id_user
    const Text = req.query.inftexp



    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')




        const Type = req.file.mimetype
        const Name = req.file.originalname
        var Id_post
        const Data = fs.readFileSync(path.join(__dirname, '../imagenes/' + req.file.filename))

        conn.query('INSERT INTO t_publicacion set ?', [{ Id_user, Text, CreationDate }], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

            Id_post = rows.insertId

            conn.query('INSERT INTO t_images set ? ', [{ Id_post, Type, Name, Data }], (err, rows) => {
                if (err) return res.status(500).send('Server Error')
            })
        })


        res.status(200).send('ok')
    })


})


const resultsPerPage = 12;

router.get('/get/userpublicimg', (req, res) => {

    const value = req.query.id_user

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('server error')

        conn.query('SELECT t_publicacion.*, t_images.Id_img, t_images.Type, t_images.Name, t_images.Data, t_usuarios.Data as imgP, t_usuarios.Username  FROM t_publicacion INNER JOIN t_images ON t_images.Id_post = t_publicacion.Id_post inner join t_usuarios on t_usuarios.Id_user = t_publicacion.Id_user  WHERE t_publicacion.Id_user =  ?  order by t_publicacion.Id_post desc ', value,
            (err, rows) => {
                if (err) return res.status(500).send('server error')

                const numOfResults = rows.length;
                const numberOfPages = Math.ceil(numOfResults / resultsPerPage);
                let page = req.query.page ? Number(req.query.page) : 1;
                if (page > numberOfPages) {
                    page = numberOfPages
                } else if (page < 1) {
                    page = 1
                }
                const startingLimit = (page - 1) * resultsPerPage;



                if (rows.length !== 0) {
                    console.log(rows.length)

                    sql = `SELECT t_publicacion.*, t_images.Id_img, t_images.Type, t_images.Name, t_images.Data, t_usuarios.Data as imgP, t_usuarios.Username  FROM t_publicacion INNER JOIN t_images ON t_images.Id_post = t_publicacion.Id_post inner join t_usuarios on t_usuarios.Id_user = t_publicacion.Id_user  WHERE t_publicacion.Id_user =  ${value}  order by t_publicacion.Id_post desc   LIMIT ${startingLimit},${resultsPerPage}`;

                    conn.query(sql, (err, result) => {
                        if (err) return res.status(500).send('server error')
                        let iterator = (page - 5) < 1 ? 1 : page - 5;
                        let endingLink = (iterator + 9) <= numberOfPages ? (iterator + 9) : page + (numberOfPages - page);
                        if (endingLink < (page + 4)) {
                            iterator -= (page + 4) - numberOfPages;
                        }
                        var imagedir
                        result.map(img => {
                            fs.writeFileSync(path.join(__dirname, '../dbimages/' + img.Id_post + '-shotshare.png'), img.Data)

                            const urlImg = 'http://127.0.0.1:9648/' + img.Id_post + '-shotshare.png'

                            if (!imagedir) {
                                if (!img.imgP) {

                                    const fotoPerf = 'http://127.0.0.1:9648/noprofilephoto.png'
                                    imagedir = [
                                        {
                                            data: {
                                                Id_post: img.Id_post,
                                                Id_user: img.Id_user,
                                                Text: img.Text,
                                                CreationDate: img.CreationDate,
                                                urlImg,
                                                fotoPerf,
                                                Username: img.Username
                                            },
                                            page,
                                            iterator,
                                            endingLink,
                                            numberOfPages,
                                            numOfResults
                                        }
                                    ]


                                } else {

                                    fs.writeFileSync(path.join(__dirname, '../profileimgs/' + img.Id_user + '-Perfshotshare.png'), result[0].imgP)
                                    const fotoPerf = 'http://127.0.0.1:9648/' + img.Id_user + '-Perfshotshare.png'
                                    imagedir = [
                                        {
                                            data: {
                                                Id_post: img.Id_post,
                                                Id_user: img.Id_user,
                                                Text: img.Text,
                                                CreationDate: img.CreationDate,
                                                urlImg,
                                                fotoPerf,
                                                Username: img.Username
                                            },
                                            page,
                                            iterator,
                                            endingLink,
                                            numberOfPages,
                                            numOfResults
                                        }
                                    ]

                                }

                            } else {
                                if (!img.imgP) {

                                    const fotoPerf = 'http://127.0.0.1:9648/noprofilephoto.png'
                                    imagedir.push(
                                        {

                                            data: {
                                                Id_post: img.Id_post,
                                                Id_user: img.Id_user,
                                                Text: img.Text,
                                                CreationDate: img.CreationDate,
                                                urlImg,
                                                fotoPerf,
                                                Username: img.Username
                                            },
                                            page,
                                            iterator,
                                            endingLink,
                                            numberOfPages,
                                            numOfResults

                                        })


                                } else {

                                    fs.writeFileSync(path.join(__dirname, '../profileimgs/' + img.Id_user + '-Perfshotshare.png'), result[0].imgP)
                                    const fotoPerf = 'http://127.0.0.1:9648/' + img.Id_user + '-Perfshotshare.png'
                                    imagedir.push(
                                        {

                                            data: {
                                                Id_post: img.Id_post,
                                                Id_user: img.Id_user,
                                                Text: img.Text,
                                                CreationDate: img.CreationDate,
                                                urlImg,
                                                fotoPerf,
                                                Username: img.Username
                                            },
                                            page,
                                            iterator,
                                            endingLink,
                                            numberOfPages,
                                            numOfResults

                                        })

                                }



                            }


                        })

                        res.status(200).json(imagedir)
                    })

                } else {
                    console.log(rows.length)
                    res.status(304)
                }

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
            conn.query(sql2, [Id_segid], (err, rows) => {
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
        const sql1 = 'DELETE t_publicacion, t_images FROM t_publicacion INNER JOIN t_images ON t_images.Id_post = t_publicacion.Id_post WHERE t_publicacion.Id_post = ?'

        conn.query(sql1, [Id_post], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

            fs.unlinkSync(path.join(__dirname, '../dbimages/' + Id_post + '-shotshare.png'))

            res.send('image deleted')
        })




    })


})

router.post('/post/imgperf', fileUpload, (req, res) => {

    const Id_user = req.query.id_user
    const DATA = fs.readFileSync(path.join(__dirname, '../imagenes/' + req.file.filename))

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')

        conn.query('UPDATE t_usuarios SET DATA = ? WHERE Id_user = ?', [DATA, Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

        })


        res.status(200).send('ok')
    })


})

router.post('/post/username', (req, res) => {

    const Id_user = req.query.id_user;
    const Username = req.query.username;

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')

        conn.query('UPDATE t_usuarios SET Username = ? WHERE Id_user = ?', [Username, Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

        })


        res.status(200).send('ok')
    })


})

router.get('/get/allusername', (req, res) => {


    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')

        conn.query('SELECT Username FROM t_usuarios', (err, rows) => {
            if (err) return res.status(500).send('Server Error')

            var jsonalluser

            rows.map(username => {
                if (!jsonalluser) {

                    jsonalluser = [
                        {
                            Username: username.Username
                        }
                    ]

                } else {

                    jsonalluser.push({
                        Username: username.Username
                    })

                }
            })


            res.json(jsonalluser)
        })
    })


})

router.get('/get/perfimgch', (req, res) => {

    const Id_user = req.query.id_user;


    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')

        conn.query('SELECT DATA FROM t_usuarios WHERE Id_user = ?', [Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

            if (!rows[0].DATA) {

                const urlImg = 'http://127.0.0.1:9648/noprofilephoto.png'

                res.status(200).json({ urlImg })

            } else {

                fs.writeFileSync(path.join(__dirname, '../profileimgs/' + Id_user + '-Perfshotshare.png'), rows[0].DATA)
                const urlImg = 'http://127.0.0.1:9648/' + Id_user + '-Perfshotshare.png'
                res.status(200).json({ urlImg })

            }

        })
    })


})

router.get('/get/allusersinf', (req, res) => {

    const Id_user = req.query.id_user;

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')

        conn.query('SELECT Id_user, Username, Data  FROM t_usuarios ', (err, rows) => {
            if (err) return res.status(500).send('Server Error')
            var allusersinf
            rows.map(item => {

                if (Id_user.toString() !== item.Id_user.toString()) {

                    if (!item.Data) {

                        const urlImg = 'http://127.0.0.1:9648/noprofilephoto.png'


                        if (allusersinf != null) {

                            allusersinf.push({
                                Id_user: item.Id_user,
                                Username: item.Username,
                                urlImg
                            })

                        } else {
                            allusersinf = [
                                {
                                    Id_user: item.Id_user,
                                    Username: item.Username,
                                    urlImg
                                }
                            ]
                        }

                    } else {

                        fs.writeFileSync(path.join(__dirname, '../profileimgs/' + item.Id_user + '-Perfshotshare.png'), item.Data)
                        const urlImg = 'http://127.0.0.1:9648/' + item.Id_user + '-Perfshotshare.png';

                        if (allusersinf != null) {

                            allusersinf.push({
                                Id_user: item.Id_user,
                                Username: item.Username,
                                urlImg
                            })

                        } else {
                            allusersinf = [
                                {
                                    Id_user: item.Id_user,
                                    Username: item.Username,
                                    urlImg
                                }
                            ]
                        }

                    }

                }





            })
            res.json(allusersinf)
        })
    })


})


router.get('/get/allifollow', (req, res) => {

    const Id_user = req.query.id_user;

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')

        conn.query('select t_seguidor.Id_segid FROM t_seguidor WHERE  t_seguidor.Id_user like ?', [Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

            var jsonalluser

            rows.map(item => {
                if (!jsonalluser) {

                    jsonalluser = [
                        {
                            Id_segid: item.Id_segid
                        }
                    ]

                } else {

                    jsonalluser.push({
                        Id_segid: item.Id_segid
                    })

                }
            })


            res.json(jsonalluser)
        })
    })


})


router.post('/post/seguir', (req, res) => {

    const Id_user = req.query.id_user;
    const Id_segid = req.query.id_segid;

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')
        conn.query('INSERT INTO t_seguidor SET Id_segid = ? , Id_user = ?', [Id_segid, Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')
            res.status(200).send('ok')
        })

    })



})
router.delete('/delete/seguir', (req, res) => {

    const Id_user = req.query.id_user;
    const Id_segid = req.query.id_segid;

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')
        conn.query('DELETE FROM  t_seguidor WHERE  Id_segid = ?  AND Id_user = ? ', [Id_segid, Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')
            res.status(200).send('ok')
        })

    })



})




const initResults = 12;

router.get('/get/mainpublish', (req, res) => {

    const value = req.query.id_user
    const Id_user = req.query.id_user

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('server error')

        conn.query('SELECT t_usuarios.Id_user, t_usuarios.Username, t_usuarios.Data as fotoperf, t_publicacion.Id_post, t_publicacion.Text , t_publicacion.CreationDate , t_images.Id_img, t_images.Type, t_images.Name, t_images.Data  from t_publicacion inner join t_usuarios on t_usuarios.Id_user = t_publicacion.Id_user inner join t_images on t_images.Id_post = t_publicacion.Id_post  where t_usuarios.Id_user IN ( select t_seguidor.Id_segid from t_seguidor inner join t_usuarios on t_usuarios.Id_user = t_seguidor.Id_user where t_seguidor.Id_user = ? ) OR t_publicacion.Id_user = ? order by t_publicacion.Id_post  desc', [Id_user, Id_user],
            (err, rows) => {
                if (err) return res.status(500).send('server error')

                const numOfResults = rows.length;
                const numberOfPages = Math.ceil(numOfResults / initResults);
                let page = req.query.page ? Number(req.query.page) : 1;
                if (page > numberOfPages) {
                    page = numberOfPages
                } else if (page < 1) {
                    page = 1
                }
                const startingLimit = (page - 1) * initResults;



                if (rows.length !== 0) {
                    console.log(rows.length)

                    sql = `SELECT t_usuarios.Id_user, t_usuarios.Username, t_usuarios.Data as fotoperf, t_publicacion.Id_post, t_publicacion.Text , t_publicacion.CreationDate , t_images.Id_img, t_images.Type, t_images.Name, t_images.Data  from t_publicacion inner join t_usuarios on t_usuarios.Id_user = t_publicacion.Id_user inner join t_images on t_images.Id_post = t_publicacion.Id_post  where t_usuarios.Id_user IN ( select t_seguidor.Id_segid from t_seguidor inner join t_usuarios on t_usuarios.Id_user = t_seguidor.Id_user where t_seguidor.Id_user = ${value} ) OR t_publicacion.Id_user = ${value} order by t_publicacion.Id_post desc LIMIT ${startingLimit},${resultsPerPage}`;

                    conn.query(sql, (err, result) => {
                        if (err) return res.status(500).send('server error')
                        let iterator = (page - 5) < 1 ? 1 : page - 5;
                        let endingLink = (iterator + 9) <= numberOfPages ? (iterator + 9) : page + (numberOfPages - page);
                        if (endingLink < (page + 4)) {
                            iterator -= (page + 4) - numberOfPages;
                        }
                        var imagedir
                        var fotoPerf
                        result.map(item => {
                            fs.writeFileSync(path.join(__dirname, '../dbimages/' + item.Id_post + '-shotshare.png'), item.Data)

                            const urlImg = 'http://127.0.0.1:9648/' + item.Id_post + '-shotshare.png'

                            if (item.fotoperf !== null) {
                                fs.writeFileSync(path.join(__dirname, '../profileimgs/' + item.Id_user + '-Perfshotshare.png'), item.fotoperf)
                                fotoPerf = 'http://127.0.0.1:9648/' + item.Id_user + '-Perfshotshare.png'
                            } else {
                                fotoPerf = 'http://127.0.0.1:9648/noprofilephoto.png'
                            }

                            if (!imagedir) {

                                imagedir = [
                                    {
                                        data: {
                                            Id_user: item.Id_user,
                                            Username: item.Username,
                                            fotoPerf,
                                            Id_post: item.Id_post,
                                            Text: item.Text,
                                            CreationDate: item.CreationDate,
                                            urlImg
                                        },
                                        page,
                                        iterator,
                                        endingLink,
                                        numberOfPages,
                                        numOfResults
                                    }
                                ]

                            } else {

                                imagedir.push(
                                    {

                                        data: {
                                            Id_user: item.Id_user,
                                            Username: item.Username,
                                            fotoPerf,
                                            Id_post: item.Id_post,
                                            Text: item.Text,
                                            CreationDate: item.CreationDate,
                                            urlImg
                                        },
                                        page,
                                        iterator,
                                        endingLink,
                                        numberOfPages,
                                        numOfResults

                                    })

                            }


                        })

                        res.status(200).json(imagedir)
                    })

                } else {
                    console.log(rows.length)
                    res.status(304)
                }

            })
    })
})

router.get('/get/allmegusta', (req, res) => {

    const value = req.query.id_user

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('server error')
        var imagedir
        conn.query('select t_publicacion.Id_post from t_like inner join t_publicacion on t_publicacion.Id_post = t_like.Id_post inner join t_usuarios on t_usuarios.Id_user  = t_like.Id_user where t_like.Id_user = ? ', value,
            (err, rows) => {
                if (err) return res.status(500).send('server error')
                rows.map(item => {

                    if (!imagedir) {

                        imagedir = [
                            {
                                Id_post: item.Id_post
                            }
                        ]

                    } else {

                        imagedir.push(
                            {
                                Id_post: item.Id_post
                            })

                    }


                })
                res.status(200).json(imagedir)
            })
    })
})

router.post('/post/likegusta', (req, res) => {



    const timeElapsed = Date.now()
    var d = new Date(timeElapsed);
    d = new Date(d.getTime() - 3000000);
    var date_format_str = d.getFullYear().toString() + "-" + ((d.getMonth() + 1).toString().length == 2 ? (d.getMonth() + 1).toString() : "0" + (d.getMonth() + 1).toString()) + "-" + (d.getDate().toString().length == 2 ? d.getDate().toString() : "0" + d.getDate().toString()) + " " + (d.getHours().toString().length == 2 ? d.getHours().toString() : "0" + d.getHours().toString()) + ":" + ((parseInt(d.getMinutes() / 5) * 5).toString().length == 2 ? (parseInt(d.getMinutes() / 5) * 5).toString() : "0" + (parseInt(d.getMinutes() / 5) * 5).toString()) + ":00";
    const CreationDate = date_format_str

    const Id_user = req.query.id_user
    const Id_post = req.query.id_post

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('server error')
        conn.query('insert into t_like set Id_user = ?, Id_post = ?, CreationDate = ? ', [Id_user, Id_post, CreationDate], (err, rows) => {
            if (err) return res.status(500).send('server error')


            res.status(200).send('ok')
        })

    })
})

router.delete('/delete/dontgusta', (req, res) => {

    const Id_user = req.query.id_user
    const Id_post = req.query.id_post

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('server error conexion')
        conn.query('delete from t_like where Id_post = ? and  Id_user = ?', [Id_post, Id_user], (err, rows) => {
            if (err) return res.status(500).send('error base de datos')
            res.status(200).send('ok')
        })

    })
})



router.get('/get/allmegustapubli', (req, res) => {

    const value = req.query.id_post

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('server error')
        var imagedir
        conn.query('select count(Id_like) as likes  from t_like where Id_post  = ? ', value,
            (err, rows) => {
                if (err) return res.status(500).send('server error')
                rows.map(item => {

                    if (!imagedir) {

                        imagedir = [
                            {
                                likes: item.likes
                            }
                        ]

                    } else {

                        imagedir.push(
                            {
                                likes: item.likes
                            })

                    }


                })
                res.status(200).json(imagedir)
            })
    })
})


router.get('/get/listfollowing', (req, res) => {

    const Id_user = req.query.id_user

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')
        const sql1 = 'SELECT t_usuarios.Id_user, t_usuarios.Username, t_usuarios.Data  FROM t_usuarios inner join t_seguidor on t_seguidor.Id_segid = t_usuarios.Id_user where t_seguidor.Id_user = ? '
        conn.query(sql1, [Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

            var allusersinf
            rows.map(item => {

                if (Id_user.toString() !== item.Id_user.toString()) {

                    if (!item.Data) {

                        const urlImg = 'http://127.0.0.1:9648/noprofilephoto.png'


                        if (allusersinf != null) {

                            allusersinf.push({
                                Id_user: item.Id_user,
                                Username: item.Username,
                                urlImg
                            })

                        } else {
                            allusersinf = [
                                {
                                    Id_user: item.Id_user,
                                    Username: item.Username,
                                    urlImg
                                }
                            ]
                        }

                    } else {

                        fs.writeFileSync(path.join(__dirname, '../profileimgs/' + item.Id_user + '-Perfshotshare.png'), item.Data)
                        const urlImg = 'http://127.0.0.1:9648/' + item.Id_user + '-Perfshotshare.png';

                        if (allusersinf != null) {

                            allusersinf.push({
                                Id_user: item.Id_user,
                                Username: item.Username,
                                urlImg
                            })

                        } else {
                            allusersinf = [
                                {
                                    Id_user: item.Id_user,
                                    Username: item.Username,
                                    urlImg
                                }
                            ]
                        }

                    }

                }





            })
            res.json(allusersinf)
        })




    })


})
router.get('/get/listfollowers', (req, res) => {

    const Id_user = req.query.id_user

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')
        const sql1 = 'SELECT t_usuarios.Id_user, t_usuarios.Username, t_usuarios.Data  FROM t_usuarios inner join t_seguidor on t_seguidor.Id_user = t_usuarios.Id_user where t_seguidor.Id_segid = ? '
        conn.query(sql1, [Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

            var allusersinf
            rows.map(item => {

                if (Id_user.toString() !== item.Id_user.toString()) {

                    if (!item.Data) {

                        const urlImg = 'http://127.0.0.1:9648/noprofilephoto.png'


                        if (allusersinf != null) {

                            allusersinf.push({
                                Id_user: item.Id_user,
                                Username: item.Username,
                                urlImg
                            })

                        } else {
                            allusersinf = [
                                {
                                    Id_user: item.Id_user,
                                    Username: item.Username,
                                    urlImg
                                }
                            ]
                        }

                    } else {

                        fs.writeFileSync(path.join(__dirname, '../profileimgs/' + item.Id_user + '-Perfshotshare.png'), item.Data)
                        const urlImg = 'http://127.0.0.1:9648/' + item.Id_user + '-Perfshotshare.png';

                        if (allusersinf != null) {

                            allusersinf.push({
                                Id_user: item.Id_user,
                                Username: item.Username,
                                urlImg
                            })

                        } else {
                            allusersinf = [
                                {
                                    Id_user: item.Id_user,
                                    Username: item.Username,
                                    urlImg
                                }
                            ]
                        }

                    }

                }





            })
            res.json(allusersinf)
        })




    })


})

router.post('/post/comentarios', (req, res) => {




    var d = new Date();
    var dformat = [d.getFullYear(),
    ((d.getMonth() + 1).toString().length == 2 ? (d.getMonth() + 1).toString() : "0" + (d.getMonth() + 1).toString()),
    (d.getDate().toString().length == 2 ? d.getDate().toString() : "0" + d.getDate().toString())].join('-') + ' ' +
        [d.getHours(),
        d.getMinutes(),
        d.getSeconds()].join(':');
    const CreationDate = dformat
    const Id_user = req.query.id_user
    const Id_post = req.query.id_post
    const Comentario = req.query.coment

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('server error')
        conn.query('insert into t_comentarios set Id_user = ?, Id_post = ?, Comentario = ?, CreationDate = ? ', [Id_user, Id_post, Comentario, CreationDate], (err, rows) => {
            if (err) return res.status(500).send('server error')


            res.status(200).send('ok')
        })

    })
})


router.get('/get/allcoments', (req, res) => {

    const Id_post = req.query.id_post

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')
        const sql1 = 'select t_usuarios.Id_user , t_usuarios.Username, t_usuarios.`Data`, t_comentarios.Comentario, t_comentarios.CreationDate, t_comentarios.Id_coment from t_comentarios inner join t_usuarios on t_usuarios.Id_user = t_comentarios.Id_user inner join t_publicacion on t_publicacion.Id_post = t_comentarios.Id_post where t_comentarios.Id_post = ? order by t_comentarios.Id_coment desc'
        conn.query(sql1, [Id_post], (err, rows) => {
            if (err) return res.status(500).send('Server Error')

            var allusersinf
            rows.map(item => {



                if (!item.Data) {

                    const urlImg = 'http://127.0.0.1:9648/noprofilephoto.png'


                    if (allusersinf != null) {

                        allusersinf.push({
                            Id_coment: item.Id_coment,
                            Username: item.Username,
                            Comentario: item.Comentario,
                            CreationDate: item.CreationDate,
                            urlImg
                        })

                    } else {
                        allusersinf = [
                            {
                                Id_coment: item.Id_coment,
                                Username: item.Username,
                                Comentario: item.Comentario,
                                CreationDate: item.CreationDate,
                                urlImg
                            }
                        ]
                    }

                } else {

                    fs.writeFileSync(path.join(__dirname, '../profileimgs/' + item.Id_user + '-Perfshotshare.png'), item.Data)
                    const urlImg = 'http://127.0.0.1:9648/' + item.Id_user + '-Perfshotshare.png';

                    if (allusersinf != null) {

                        allusersinf.push({
                            Id_coment: item.Id_coment,
                            Username: item.Username,
                            Comentario: item.Comentario,
                            CreationDate: item.CreationDate,
                            urlImg
                        })

                    } else {
                        allusersinf = [
                            {
                                Id_coment: item.Id_coment,
                                Username: item.Username,
                                Comentario: item.Comentario,
                                CreationDate: item.CreationDate,
                                urlImg
                            }
                        ]
                    }

                }







            })
            res.json(allusersinf)
        })




    })


})

router.get('/get/oneusersinf', (req, res) => {

    const Id_user = req.query.id_user;

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send('Server Error')

        conn.query('SELECT Id_user, Username, Data  FROM t_usuarios WHERE Id_user = ?', [Id_user], (err, rows) => {
            if (err) return res.status(500).send('Server Error')
            var allusersinf
            rows.map(item => {



                if (!item.Data) {

                    const urlImg = 'http://127.0.0.1:9648/noprofilephoto.png'


                    if (allusersinf != null) {

                        allusersinf.push({
                            Id_user: item.Id_user,
                            Username: item.Username,
                            urlImg
                        })

                    } else {
                        allusersinf = [
                            {
                                Id_user: item.Id_user,
                                Username: item.Username,
                                urlImg
                            }
                        ]
                    }

                } else {

                    fs.writeFileSync(path.join(__dirname, '../profileimgs/' + item.Id_user + '-Perfshotshare.png'), item.Data)
                    const urlImg = 'http://127.0.0.1:9648/' + item.Id_user + '-Perfshotshare.png';

                    if (allusersinf != null) {

                        allusersinf.push({
                            Id_user: item.Id_user,
                            Username: item.Username,
                            urlImg
                        })

                    } else {
                        allusersinf = [
                            {
                                Id_user: item.Id_user,
                                Username: item.Username,
                                urlImg
                            }
                        ]
                    }

                }







            })
            res.json(allusersinf)
        })
    })


})




module.exports = router
