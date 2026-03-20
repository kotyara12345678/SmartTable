import express from 'express';
const app = express();

app.use(express.json());

export function RunServer(port: string): void {

}


app.get('/', (req: any, res: any) => {
    res.json({
        "hello": "Hello World!",
    })
})

app.listen("8080");