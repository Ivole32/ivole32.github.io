import json

USERNAME = 'ivole32'
while True:
    stream_status = int(input("1) Live \n2) Offline\nEingabe: "))
    if stream_status ==1 or stream_status == 2:
        break

if stream_status == 1:
    stream_status = 'Live'
else:
    stream_status = 'Offline'

stream_info = {
    'username': USERNAME,
    'stream_status': stream_status
}

with open('data.json', 'w') as json_file:
    json.dump(stream_info, json_file, indent=4)