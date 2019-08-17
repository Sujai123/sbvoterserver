const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId
var url = "mongodb://localhost:27017/";

const app = new express()


app.use(bodyParser.json())
app.use(cors())

app.post('/',(req,response)=>{
    let username = req.body.username
    let pollname = req.body.pollname
    let noofparticipants = req.body.participants
    let maxvotes = req.body.maxvotes
    let endtime = req.body.endtime
    endtime=endtime*60*1000
    let d = Date.now()+endtime
    let date = new Date(d)

    let participants = noofparticipants.map((participant)=>{
        let o = {
            participant:participant,
            votes:0
        }
        return o
    })

    let id
    let obj = {
        username:username,
        pollname:pollname,
        participants:participants,
        users:[],
        maxvotes:maxvotes,
        endtime:date
    }

    let s = "no"
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("voter").insertOne(obj, (err, res) => {
          if (err) throw err;
          console.log("1 document inserted");
          id=res.ops[0]._id
          s = ObjectId(id).toString()
          obj.pollid=s
          response.send(obj)
          db.close();
        });
    })
})

app.post('/vote',(req,res)=>{
    let username = req.body.username
    let pollid = req.body.pollid
    let q = new ObjectId(pollid)

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        var query = { _id:q };
        dbo.collection("voter").find(query).toArray(function(err, result) {
          if (err) throw err;
          let flg = true
          if(result.length>0){
          result[0].users.map((user)=>{
              if(user===username)
              flg=false
          })
          if(flg===true){
              let current = new Date()
              let endtime = result[0].endtime
              if(current<endtime){
                result[0].users.push(username)
                let newvalues = {$set: {users:result[0].users }}
                dbo.collection("voter").updateOne(query, newvalues, function(err, obj) {
                    if (err) throw err;
                    console.log("1 document updated");
                    res.send(result[0])
                    db.close();
                });
              }
              else{
                result[0].str = "Sorry! Voting time is over"
                res.send(JSON.stringify(result[0]))
              }
          }
          else{
            result[0].str = "You already voted for this poll"
            res.send(JSON.stringify(result[0]))
          }  
          db.close();
        }
        else{
          res.send(err)
        }
        });
        
      });
})

app.post('/vote/votesubmit',(req,res)=>{
  let obj = req.body
  delete obj.str
  let pollid = req.body._id
  let q = new ObjectId(pollid)

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var query = { _id:q };
    dbo.collection("voter").find(query).toArray(function(err, result) {
      if (err) throw err;
      let arr = []
      result[0].participants.map((user,i)=>{
        let totalvotes = (Number)(user.votes) + (Number)(obj.participants[i].votes)
        let adduser={
          participant:user.participant,
          votes:totalvotes
        }
        arr.push(adduser)
      })
        MongoClient.connect(url, function(err, db) {
          if (err) throw err;
          var dbo = db.db("mydb");
          var query = { _id:q };
          var newvalues = { $set: {participants : arr} };
          dbo.collection("voter").updateOne(query, newvalues, function(err, result) {
            if (err) throw err;
            res.send(JSON.stringify("Successfully Submitted"))
            console.log("1 document updated");
            db.close();
          });
        });
      db.close();
    });
  });
  
})


app.post('/result',(req,res)=>{
  let username = req.body.username
  let pollid = req.body.pollid
  let q = new ObjectId(pollid)

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var query = { _id:q };
    dbo.collection("voter").find(query).toArray(function(err, result) {
      if (err) throw err;
      res.send(result[0]);
      db.close();
    });
  });
})

app.post('/searchbyname',(req,res)=>{
  let name = req.body.name
  MongoClient.connect(url,(err,db)=>{
    if(err) throw err;
    let dbo = db.db("mydb")
    let query = { username:name }
    dbo.collection('voter').find(query).toArray((err,result)=>{
      if(err) throw err
      res.send(result)
      db.close()
    })
  })
})

app.listen(3001,()=>{
    console.log("Server started")
})