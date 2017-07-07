# NQM Databot WAHSN Tool Docs
## Databot inputs
* ```datasetAccounts``` - account list table id
* ```datasetMap``` - map table id
* ```datasetShare``` - share table id
* ```datasetSkills``` - skills matrix table id
* ```function``` - databot commands (see below)

The additional configuration parameters of the databot are located in the package parameters section of the databot GUI.

## Databot commands
* ```createAccounts``` - creates the user accounts from account list table data. Generates the secret for each account and adds it to the account list table. One needs to change the ```packageParams.accountOwner``` so that the share tokens belong to the owner executing the databot.
* ```addShare``` - add share with given permission to the datasets from share table for each user from account list table.
* ```removeShare``` - remove share permission for datasets from share table for each user from account list table.
* ```deleteAccountData``` - removes the account (accounts from account list table) data for each dataset in map table.
* ```datasetsInit``` - initializes each account with default data from map table.
* ```skillsInit``` - initializes the skills matrix dataset (https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FryxlKJP5nx%2Fdata) with data from google spreadsheet (https://docs.google.com/spreadsheets/d/1oiWeoJoeRJoOgorMqXV4Ea9ElSfP9TbRJCW_m7PPTt0/edit#gid=1982823738)

## Table definitions
Example tables:

* Account list table - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FBkgLeWIBMb%2Fdata
* Share table - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FH1lWLP9Izb%2Fdata
* Map table - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FSJxJ75Oi0e%2Fdata

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

The location of the datasets:
* rag matrix filtered - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FBJfbYnfoxb%2Fdata
* skills matrix filtered - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FBJeSsC4I0l%2Fdata
* Consultation by location filtered - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FH1lyONrUAe%2Fdata
* GP consultations filtered - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FS1ludSHI0x%2Fdata
* salaries filtered - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FHJxI9BrI0x%2Fdata
* service poplet filtered - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FBke2bSVRRl%2Fdata
* substitution matrix filtered - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FrJlze8HU0x%2Fdata
* working hours filtered - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fdatasets%2FHkgWmLrU0g%2Fdata

### Map table
The map table contains the table ids that need to be initialized with data (for each account) from json resources. For instance by default each user needs to have an entry in the rag matrix table. The json resource contains the default value for the rag matrix. In addition the map table contains a column called ```field```, which identifies the account key in tool datasets. For instance if ```field == serviceId``` then the dataset corresponding to this field will have all its account identifiers under ```serviceId```.

The defult map table:

| ```resourceIn``` | ```description``` | ```field``` | ```resourceOut``` | ```type``` |
| --- | --- | --- | --- | --- |
| B1llvw5sCe | rag matrix default | serviceId | SJxHvSRupg | json |
| SkgJ4CtiRe | service poplet default | serviceId | S1MQWDqT5e | json |
| H1lEfoy0Ag | substitution matrix default | serviceId | SkeFf39p9x | json |

The location of the default datasets:
* rag matrix default - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fresource%2FB1llvw5sCe%2Fpreview
* service poplet default - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fresource%2FSkgJ4CtiRe%2Fpreview
* substitution matrix default - https://tdx.nq-m.com/auth?rurl=https%3A%2F%2Fq.nq-m.com%2Fv1%2Fresource%2FH1lEfoy0Ag%2Fpreview


