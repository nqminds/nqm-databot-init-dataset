# NQM Databot WAHSN Tool Docs
## Databot commands
* ```createAccounts``` - creates the user accounts from account list table data. Generates the secret for each account and adds it to the account list table.

## Table definitions

### Account list table
The accounts table stores the ```accountId```, ```accountName``` and ```accountSecret```. To create a list of users one needs to add only the info for ```accountId``` and ```accountName```. The databot will generate the ```accountSecret``` automatically.

| ```accountId``` | ```accountName``` | ```accountSecret``` |
| --- | --- | --- |
| sdhjs53HX | John Smith | pass_for_john |
| sewrtejs53HX | Andrew Smith | pass_for_andrew |
| ptyoiejsAF | Mark Smith | pass_for_mark |

### Share table
The share table contains the ids of the datasets and the permissions for each user in from account list table. The permission can be
* ```r``` - only read
* ```w``` - only write
* ```r/w``` - read and write

The table below contains all the permissions for each dataset used in the WAHSN tool.


| ```datasetId``` | ```permission``` | ```description``` |
| --- | --- | --- |
| BJfbYnfoxb | r/w | rag matrix filtered |
| BJeSsC4I0l | r | skills matrix filtered |
| H1lyONrUAe | r | Consultation by location filtered |
| S1ludSHI0x | r | GP consultations filtered |
| HJxI9BrI0x | r | salaries filtered |
| Bke2bSVRRl | r/w | service poplet filtered |
| rJlze8HU0x | r/w | substitution matrix filtered |
| HkgWmLrU0g | r | working hours filtered |
