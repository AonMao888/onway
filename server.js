require('dotenv').config({ debug: true });
const express = require('express');
var admin = require('firebase-admin');
const cors = require('cors');
const { Expo } = require('expo-server-sdk');
const ImageKit = require("@imagekit/nodejs");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    origin: '*'
}));

const expo = new Expo();
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

const client = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

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

//get imagekit auth
app.get('/imagekit/auth', (req, res) => {
    const { token, expire, signature } = client.helper.getAuthenticationParameters();
    res.json({ token, expire, signature, publicKey: process.env.IMAGEKIT_PUBLIC_KEY });
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
                name: data.name,
                type: data.type,
                price: data.price,
                photo: data.photo,
                about:data.about,
                shopname:data.shopname,
                shopid:data.shopid,
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
                name: data.name,
                type: data.type,
                price: data.price,
                shopname:data.shopname,
                shopid:data.shopid,
                about:data.about
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
                deliveryfee:data.deliveryfee,
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
        await db.collection('order').doc(data.id).update({
            status: 'Delivered'
        }).then(() => {
            res.json({
                status: "success",
                text: "This order was delivered."
            })
        })
    } else {
        res.json({
            status: "fail",
            text: "Error to pick order!"
        })
    }
})

//set any order delivery fee
app.post('/delivery/order/fee', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('order').doc(data.id).update({
            deliveryfee: data.deliveryfee
        }).then(() => {
            res.json({
                status: "success",
                text: "Order's delivery fee was set."
            })
        })
    } else {
        res.json({
            status: "fail",
            text: "Error to set delivery order fee!"
        })
    }
})

//driver got the order
app.post('/driver/got/order', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('order').doc(data.orderid).update({
            status: 'On going'
        }).then(async () => {
            await db.collection('jobs').doc(data.jobid).update({
                status: 'On going',
                'orderdata.status': 'On going'
            }).then(() => {
                res.json({
                    status: "success",
                    text: "You got this order."
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

//driver delivery to order
app.post('/driver/delivery/order', async (req, res) => {
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
    let g = await db.collection('counterholders').orderBy('addedtime', 'desc').get();
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
    let g = await db.collection('drivers').orderBy('addedtime', 'desc').get();
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
                pushtoken: '',
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
//get driver by raw
app.get('/get/raw/driver/:email', async (req, res) => {
    let { email } = req.params;
    if (email) {
        let ll = await db.collection('drivers').where('email', '==', email).get()
        if (ll.empty) {
            res.json([])
        } else {
            let cdata = ll.docs.map(i => ({ id: i.id, addtime: getdate(i.data().addedtime), ...i.data() }));
            res.json(cdata)
        }
    } else {
        res.json([])
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

function formatDateTime(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;

    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

    return `${month}-${day}-${year} ${hours}:${formattedMinutes}${ampm}`;
}

//add new job
app.post('/add/job', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('jobs')
            .add({
                ...data,
                status: 'Picked',
                addtime: admin.firestore.FieldValue.serverTimestamp()
            }).then(async () => {
                const message = {
                    notification: {
                        title: 'New order...',
                        body: 'New order was received.'
                    },
                    token: data.driver.pushtoken,
                };
                try {
                    const response = await admin.messaging().send(message);
                    res.json({ status: "success", text: "Job was sent to driver.", response });
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ status: "error", text: error.message });
                }
            }).catch(e => {
                console.log(e);
                res.json({
                    status: "fail",
                    text: "New job was unsuccessful to add."
                })
            })
    } else {
        res.json({
            status: "fail",
            text: "Something went wrong!"
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
    let g = await db.collection('jobs').orderBy('addtime', 'desc').get();
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
//get raw job
app.get('/raw/job', async (req, res) => {
    let g = await db.collection('jobs').orderBy('addtime', 'desc').get();
    if (g.empty) {
        res.json([])
    } else {
        let all = g.docs.map(d => ({ id: d.id, addedtime: getdate(d.data().addtime), ...d.data() }));
        res.json(all)
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
                name: data.name,
                adddate: admin.firestore.FieldValue.serverTimestamp()
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

//add push token
app.post('/pushtoken', async (req, res) => {
    let data = req.body;
    if (data) {
        let got = await db.collection('drivers').where('email', '==', data.email).get();
        if (got.empty) {
            res.json({
                status: "fail",
                text: "No driver found with this email.",
            })
        } else {
            await got.docs[0].ref.update({
                pushtoken: data.token
            }).then((e) => {
                res.json({
                    status: "success",
                    text: "Push token was successfully added.",
                })
            }).catch(e => {
                res.json({
                    status: "fail",
                    text: "Something went wrong to add push token"
                })
            })
        }
    }
})

//push notification
app.post("/push-notification", async (req, res) => {
    const { token, title, body, metadata } = req.body;
    // Basic validation
    if (!token || !title || !body) {
        return res.status(400).send("Missing required fields: token, title, or body.");
    }
    if (!Expo.isExpoPushToken(token)) {
        return res.status(400).send("Invalid push token.");
    }
    const message = {
        to: token,
        sound: "default",
        title: title,
        body: body,
        data: { metadata }, // Pass the metadata as an object
    };
    try {
        const tickets = await expo.sendPushNotificationsAsync([message]);
        return res.status(200).json(tickets);
    } catch (error) {
        console.error("Error sending push notification:", error);
        return res.status(500).send("An unexpected error occurred.");
    }
});

app.get('/send', async (req, res) => {
    let { token } = req.query;
    const message = {
        notification: {
            title: 'New order...',
            body: 'New order was received.'
        },
        token: token,
    };
    try {
        const response = await admin.messaging().send(message);
        res.json({ status: "success", response });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", text: error.message });
    }
})

//check is admin
app.get('/check/admin/:email', async (req, res) => {
    let { email } = req.params;
    if (email) {
        let ll = await db.collection('admin').where('email', '==', email).get()
        if (ll.empty) {
            res.json({
                status: "fail",
                text: "No account found!"
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

//get all shop
app.get('/shop', async (req, res) => {
    let g = await db.collection('shop').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json({
            status: "success",
            text: "Shop was got.",
            data: all
        })
    }
})

//get specific shop data
app.get('/shop/:id', async (req, res) => {
    let { id } = req.params;
    let got = await db.collection('shop').doc(id).get();
    if (got.exists) {
        let data = { id: got.id, addtime: getdate(got.data().addedtime), ...got.data() }
        res.json({
            status: "success",
            text: "Shop found.",
            data: data
        })
    } else {
        res.json({
            status: "fail",
            text: "No shop found with this ID!"
        })
    }
})

//add shop
app.post('/add/shop', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('shop')
            .add({
                name: data.name,
                type: data.type,
                photo:data.photo,
                address:data.address,
                about:data.about,
                location:data.location,
                addedtime: admin.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                res.json({
                    status: "success",
                    text: "Shop was added."
                })
            })
    }
})

//update shop
app.post('/update/shop', async (req, res) => {
    let data = req.body;
    if (data) {
        await db.collection('shop').doc(data.id)
            .update({
                name: data.name,
                type: data.type,
                about: data.about,
                location: data.location,
            }).then(() => {
                res.json({
                    status: "success",
                    text: "Shop was updated."
                })
            })
    }
})


app.listen(80, () => {
    console.log('Server started with port 80');
})