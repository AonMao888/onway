require('dotenv').config()
const express = require('express');
var admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    origin: '*'
}));

var cer = {
    "type": "service_account",
    "project_id": process.env.PROJECTID,
    "private_key_id": process.env.PRIVATEKEYID,
    "private_key": process.env.PRIVATEKEY,
    "client_email": process.env.CLIENTEMAIL,
    "client_id": process.env.CLIENTID,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": process.env.CLIENTCERT,
    "universe_domain": "googleapis.com"
}

admin.initializeApp({
    credential: admin.credential.cert(cer)
});
const db = admin.firestore();

function getdate(e) {
    let jsdate = e.toDate();
    const formattedDate = jsdate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    return formattedDate;
}

app.get('/', (req, res) => {
    res.send(process.env.HOMETEXT)
})
//get all shop
app.get('/allshop', (req, res) => {
    res.json({
        status: "success",
        data: {}
    })
})

//get all menu
app.get('/menu', async (req, res) => {
    let g = await db.collection('menu').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json({
            status: "success",
            text: "Menu was got.",
            data: all
        })
    }
})

//add menu
app.post('/add/menu', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('menu')
            .add({
                englishname: data.englishname,
                chiname: data.chiname,
                tainame: data.tainame,
                myanname: data.myanname,
                type: data.type,
                price: data.price,
                photo: data.photo,
                addedtime: admin.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                res.json({
                    status: "success",
                    text: "Menu was added."
                })
            })
    }
})

//update menu
app.post('/update/menu', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('menu').doc(data.id)
            .update({
                englishname: data.englishname,
                chinaname: data.chinaname,
                tainame: data.tainame,
                myanname: data.myanname,
                type: data.type,
                price: data.price,
                photo: data.photo,
            }).then(() => {
                res.json({
                    status: "success",
                    text: "Menu was updated."
                })
            })
    }
})

//add order
app.post('/add/order', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('order')
            .add({
                username: data.username,
                useremail: data.useremail,
                userid: data.userid,
                userphoto: data.userphoto,
                userphone: data.userphone,
                useraddress: data.useraddress,
                note: data.note,
                lat: data.lat,
                long: data.long,
                status: 'Received',
                discount: data.discount,
                discountname: data.discountname,
                discountcode: data.discountcode,
                time: admin.firestore.FieldValue.serverTimestamp(),
                list: data.list
            }).then((e) => {
                res.json({
                    status: "success",
                    text: "Your order was successfully take.",
                    id: e.id
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "Something went wrong to order"
                })
            })
    }
})

//add order
app.post('/add/more/order/:id', async (req, res) => {
    let { id } = req.params;
    let data = req.body;
    if (data) {
        await db.collection('order').doc(id)
            .update({
                list: admin.firestore.FieldValue.arrayUnion(...data.list)
            }).then(async (e) => {
                await db.collection('order').doc(id)
                    .update({
                        username: data.username,
                        userphone: data.userphone,
                        lat: data.lat,
                        long: data.long,
                        note: data.note,
                        address: data.useraddress,
                        discount: data.discount,
                        discountname: data.discountname,
                        discountcode: data.discountcode,
                    }).then(() => {
                        res.json({
                            status: "success",
                            text: "Your order was successfully take.",
                            id: id
                        })
                    })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "Something went wrong to order"
                })
            })
    }
})

//get all order
app.get('/order', async (req, res) => {
    let g = await db.collection('order').orderBy('time', 'desc').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, ordertime: getdate(d.data().time), ...d.data() }));
        res.json({
            status: "success",
            text: "Order was got.",
            data: all
        })
    }
})

//get specific order data
app.get('/order/:id', async (req, res) => {
    let { id } = req.params;
    let got = await db.collection('order').doc(id).get();
    if (got.exists) {
        let data = { id: got.id, ordertime: getdate(got.data().time), ...got.data() }
        res.json({
            status: "success",
            text: "Order found.",
            data: data
        })
    } else {
        res.json({
            status: "fail",
            text: "No order found with this ID!"
        })
    }
})

//pick any order
app.post('/pick/order', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('order').doc(data.id).update({
            status: 'Picked'
        }).then(() => {
            res.json({
                status: "success",
                text: "This order was picked."
            })
        })
    } else {
        res.json({
            status: "fail",
            text: "Error to pick order!"
        })
    }
})

//delivery to order
app.post('/delivery/order', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('order').doc(data.orderid).update({
            status: 'Delivered'
        }).then(async () => {
            await db.collection('jobs').doc(data.jobid).update({
                status: 'Delivered'
            }).then(() => {
                res.json({
                    status: "success",
                    text: "This order was delivered."
                })
            })
        })
    } else {
        res.json({
            status: "fail",
            text: "Error to pick order!"
        })
    }
})

//update profile
app.post('/update/profile', async (req, res) => {
    let data = req.body;
    if (data) {
        let ch = await db.collection('user').doc(data.userid).get();
        if (ch.exists) {
            await db.collection('user').doc(data.userid).update({
                username: data.username,
                useremail: data.useremail,
                userid: data.userid,
                userphoto: data.userphoto,
                userphone: data.userphone,
                addtime: admin.firestore.FieldValue.serverTimestamp(),
            }).then((e) => {
                res.json({
                    status: "success",
                    text: "Your profile was successfully updated.",
                    id: e.id
                })
            }).catch(e => {
                console.log(e);

                res.json({
                    status: "fail",
                    text: "Something went wrong to update"
                })
            })
        } else {
            await db.collection('user').doc(data.userid).create({
                username: data.username,
                useremail: data.useremail,
                userid: data.userid,
                userphoto: data.userphoto,
                userphone: data.userphone,
                addtime: admin.firestore.FieldValue.serverTimestamp(),
            }).then((e) => {
                res.json({
                    status: "success",
                    text: "Your profile was successfully created.",
                    id: e.id
                })
            }).catch(e => {
                console.log(e);

                res.json({
                    status: "fail",
                    text: "Something went wrong to create"
                })
            })
        }
    }
})

//get specific user data
app.get('/profile/:id', async (req, res) => {
    let { id } = req.params;
    let got = await db.collection('user').doc(id).get();
    if (got.exists) {
        let data = { id: got.id, ...got.data() }
        res.json({
            status: "success",
            text: "Profile found.",
            data: data
        })
    } else {
        res.json({
            status: "fail",
            text: "No user found with this ID!"
        })
    }
})

//get all user
app.get('/users', async (req, res) => {
    let g = await db.collection('user').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json({
            status: "success",
            text: "Users was got.",
            data: all
        })
    }
})

//add counter holder
app.post('/add/counterholder', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('counterholders')
            .add({
                name: data.name,
                email: data.email,
                addedtime: admin.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                res.json({
                    status: "success",
                    text: "Counter holder was added."
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "Counter holder was unsuccessful to add."
                })
            })
    }
})

//update counter holder
app.post('/update/counterholder', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('counterholders').doc(data.id)
            .update({
                name: data.name,
                email: data.email,
            }).then(() => {
                res.json({
                    status: "success",
                    text: "Counter holder was updated."
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "Counter holder was unsuccessful to update."
                })
            })
    }
})

//get counter holder
app.get('/get/counterholder/:email', async (req, res) => {
    let { email } = req.params;
    if (email) {
        let ll = await db.collection('counterholders').where('email', '==', email).get()
        if (ll.empty) {
            res.json({
                status: "fail",
                text: "No counter holder found!"
            })
        } else {
            let cdata = ll.docs.map(i => ({ id: i.id, ...i.data() }));
            res.json({
                status: "success",
                text: "Data found",
                data: cdata
            })
        }
    } else {
        res.json({
            status: "fail",
            text: "Parameter required."
        })
    }
})

//get all counters
app.get('/counters', async (req, res) => {
    let g = await db.collection('counterholders').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, addtime: getdate(d.data().addedtime), ...d.data() }));
        res.json({
            status: "success",
            text: "Counters was got.",
            data: all
        })
    }
})

//get all drivers
app.get('/drivers', async (req, res) => {
    let g = await db.collection('drivers').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, addtime: getdate(d.data().addedtime), ...d.data() }));
        res.json({
            status: "success",
            text: "Drivers was got.",
            data: all
        })
    }
})

//add new driver
app.post('/add/driver', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('drivers')
            .add({
                name: data.name,
                email: data.email,
                addedtime: admin.firestore.FieldValue.serverTimestamp(),
                address: data.address,
                lat: '',
                long: '',
            }).then(() => {
                res.json({
                    status: "success",
                    text: "New Driver was added."
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "New driver was unsuccessful to add."
                })
            })
    }
})

//update driver
app.post('/update/driver', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('drivers').doc(data.id)
            .update({
                name: data.name,
                email: data.email,
                address: data.address
            }).then(() => {
                res.json({
                    status: "success",
                    text: "Driver was updated."
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "Driver was unsuccessful to update."
                })
            })
    }
})

//get driver
app.get('/get/driver/:email', async (req, res) => {
    let { email } = req.params;
    if (email) {
        let ll = await db.collection('drivers').where('email', '==', email).get()
        if (ll.empty) {
            res.json({
                status: "fail",
                text: "No driver found!"
            })
        } else {
            let cdata = ll.docs.map(i => ({ id: i.id, addtime: getdate(i.data().addedtime), ...i.data() }));
            res.json({
                status: "success",
                text: "Data found",
                data: cdata
            })
        }
    } else {
        res.json({
            status: "fail",
            text: "Parameter required."
        })
    }
})

//get driver
app.get('/update/driver/:email/location', async (req, res) => {
    let { email } = req.params;
    let { lat, long } = req.query;
    if (email) {
        let ll = await db.collection('drivers').where('email', '==', email).get()
        if (ll.empty) {
            res.json({
                status: "fail",
                text: "No driver found!"
            })
        } else {
            let driverdoc = ll.docs[0];
            await driverdoc.ref.update({
                lat: lat,
                long: long
            }).then(() => {
                res.json({
                    status: "success",
                    text: "Location updated.",
                })
            })
        }
    } else {
        res.json({
            status: "fail",
            text: "Parameter required."
        })
    }
})

//update driver
app.post('/info/add', async (req, res) => {
    let data = req.body;
    if (data) {
        let rr = data.buildmodel + data.androidversion.split(' ')[1];
        await db.collection('info').doc(rr).set({
            addtime: admin.firestore.FieldValue.serverTimestamp(),
            ...data
        }).then(() => {
            res.json({
                status: "success",
                text: "Data was added."
            })
        }).catch(e => {
            res.json({
                status: "fail",
                text: "Unable to add data."
            })
        })
    }
})

//get all drivers
app.get('/info', async (req, res) => {
    let g = await db.collection('info').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, addtime: getdate(d.data().addtime), ...d.data() }));
        res.json({
            status: "success",
            text: "Data was got.",
            data: all
        })
    }
})

//add new job
app.post('/add/job', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('jobs')
            .add({
                ...data,
                status: 'Picked',
                addtime: admin.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                res.json({
                    status: "success",
                    text: "New job was added."
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "New job was unsuccessful to add."
                })
            })
    }
})

//get specific job data
app.get('/job/:id', async (req, res) => {
    let { id } = req.params;
    let got = await db.collection('jobs').doc(id).get();
    if (got.exists) {
        let data = { id: got.id, addedtime: getdate(got.data().addtime), ...got.data() }
        res.json({
            status: "success",
            text: "Order found.",
            data: data
        })
    } else {
        res.json({
            status: "fail",
            text: "No order found with this ID!"
        })
    }
})

//get all jobs
app.get('/job', async (req, res) => {
    let g = await db.collection('jobs').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, addedtime: getdate(d.data().addtime), ...d.data() }));
        res.json({
            status: "success",
            text: "Data was got.",
            data: all
        })
    }
})

//add new promotion code
app.post('/add/promo', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('promo')
            .add({
                ...data,
                addtime: admin.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                res.json({
                    status: "success",
                    text: "New promotion code was added."
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "New promotion code was unsuccessful to add."
                })
            })
    }
})

//update promotion code
app.post('/update/promo', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('promo').doc(data.id)
            .update({
                name: data.name,
                expiry: data.expiry,
                discount: data.discount,
                code: data.code
            }).then(() => {
                res.json({
                    status: "success",
                    text: "Promotion code was updated."
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "Promotion code was unsuccessful to update."
                })
            })
    }
})

//get all promotion codes
app.get('/promo', async (req, res) => {
    let g = await db.collection('promo').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, addedtime: getdate(d.data().addtime), ...d.data() }));
        res.json({
            status: "success",
            text: "Data was got.",
            data: all
        })
    }
})

//add menu type
app.post('/add/menutype', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('menutype')
            .add({
                name:data.name,
                adddate:admin.firestore.FieldValue.serverTimestamp()
            }).then((e) => {
                res.json({
                    status: "success",
                    text: "Menu type was successfully added.",
                    id: e.id
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "Something went wrong to add menu type"
                })
            })
    }
})

//get all menu types
app.get('/menutype', async (req, res) => {
    let g = await db.collection('menutype').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, addedtime: getdate(d.data().adddate), ...d.data() }));
        res.json({
            status: "success",
            text: "Data was got.",
            data: all
        })
    }
})

//delete menu type
app.post('/delete/menutype', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('menutype').doc(data.id)
        .delete().then((e) => {
                res.json({
                    status: "success",
                    text: "Menu type was deleted.",
                    id: e.id
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "Something went wrong to delete menu type"
                })
            })
    }
})


app.listen(80, () => {
    console.log('Server started with port 80');
})