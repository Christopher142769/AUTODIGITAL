import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

client = AsyncIOMotorClient(
    "mongodb+srv://christopherguidibi_db_user:thE1I0XYaZaNSIkX@autodigital.ileuov7.mongodb.net/autodigital?retryWrites=true&w=majority&appName=autodigital",
    tls=True,
    tlsCAFile=certifi.where(),
    tlsAllowInvalidCertificates=False
)

async def test():
    print(await client.admin.command("ping"))

asyncio.run(test())
