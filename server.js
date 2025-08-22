const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const adminfile = require('./firebase-adminsdk.json');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    origin: '*'
}));

admin.initializeApp({
    credential: admin.credential.cert(adminfile)
});
const db = admin.firestore();

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
                        address: data.useraddress
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
    let g = await db.collection('order').get();
    if (g.empty) {
        res.json({
            status: "fail",
            text: "Error to get data!"
        })
    } else {
        let all = g.docs.map(d => ({ id: d.id, ...d.data() }));
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
        let data = { id: got.id, ...got.data() }
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

app.listen(80, () => {
    console.log('Server started with port 80');
})