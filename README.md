
**8. Database**
   - Created a DynamoDB table, named the table. Creating an item to count views.

**9-10. API & Python**  
- Created a Lambda function. Named the function. Used the latest Python runtime. Created a new execution role. Enabled a function URL to create a public URL to invoke the Lambda function. Selected NONE for "Auth type". Enabled CORS and will whitelist my domain only to fetch data from the API.
- **_Issues_**: Lambda function was not communicating with the DynamoDB database. Checked the CloudWatch Logs and there was a syntax issue. I replaced and updated the code with an AI corrected version:

```python
import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('<table-name>')

def lambda_handler(event, context):
    response = table.get_item(Key={'id': '0'})
    item = response.get('Item', {'id': '0', 'views': 0})
    views = item['views'] + 1

    table.put_item(Item={
        'id': '0',
        'views': views
    })

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({"views": views})
    }
```

Retried the function and I received another error. This time it was an IAM issue with the Lambda execution role that needed to be explicitly allowed access to the DynamoDB. I added a new inline policy to the execution role to read/write to the DynamoDB table. Select Lambda execution role, role name > Permissions > Add permissions > Create new inline policy:  
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:<aws-account-number>:table/<table-name>"
    }
  ]
}
```

Received another error message in the lambda code. TypeError. DynamoDB stores numbers as decimal, not Python `int`. Python's `json.dumps()` cannot serialize a decimal. I need to update the last line of the code (line 23) and test.  
```python
import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('<bucket-name>')

def lambda_handler(event, context):
    response = table.get_item(Key={'id': '0'})
    item = response.get('Item', {'id': '0', 'views': 0})
    views = int(item['views']) + 1

    table.put_item(Item={
        'id': '0',
        'views': views
    })

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({"views": views})
    }
```

**9b.**  
- Configured the Allow Origin of the function URL to my domain to limit access from the public.

**9c.**  
- Configured a new bucket policy. The policy was not correct for OAC in CloudFront. Here is the new policy:  
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ryanjonesesq/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<ACCOUNT-ID>:distribution/<DISTRIBUTION-ID>"
        }
      }
    }
  ]
}
```

**9d.**  
- The Lambda URL returned an invalid CORS headers. Therefore, I needed to update the Lambda function code to remove the CORS headers and redeploy. Here is the new code for the Lambda function:  
```python
import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('<table-name>')

def lambda_handler(event, context):
    response = table.get_item(Key={'id': '0'})
    item = response.get('Item', {'id': '0', 'views': 0})
    views = item['views'] + 1

    table.put_item(Item={
        'id': '0',
        'views': views
    })

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps({"views": int(views)})
    }
```

**11. Tests**  

**12. IaC**  
In order to use the AWS CLI, I created a new IAM role in the Management Console. I attached AdministratorAccess permission. After the user was created, I also created access and secret keys. This is not recommendation, so I will look for a more secure solution to create short term credentials for better security. 

Using Terraform for this section. Created `main.tf` and `provider.tf` files.  

Created a Lambda function and IAM role for the Lambda function:  Insert code here


**Issues**: I had several syntax/configuration issues correcting named resources, initializing terraform, running terraform plan and with the JSON policy for the IAM role in my `main.tf` file. I needed to configure my data block to be aligned with the directory name `source_dir = "${path.module}/lambda"`. I needed to configure an AWS profile so Terraform to use my credentials. Takeaways are to be resources are consistently named and directories are in the correct hierarchy. 

**13. Source Control**  
Created a new repository on GitHub and using the CLI. Commands used:  
`git init`  
`git add .`  
`git commit -m "Initial commit"`  
`git branch -M main`  
`git remote add origin https://github.com/jonesey1955/aws-cloud-resume-challenge-git`  
`git push -u origin main`  

_**Issues**_: I received an error message on the last command. I need to generate a personal access token (PAT) for authentication. Profile > Settings > Developer settings > Tokens (classic). Selected scope set to `repo`. Select `workflow`. Generate token. 

Next, I need to erase to clear my Mac's cached GitHub credentials.   
Therefore, `git credential-osxkeychain` was erased because my macOS was using the old, invalid credential for HTTPS pushes
`host=GitHub.com`
`protocol=httsp`

Press Enter twice. Run `git push -u origin main`. Enter username and PAT for the password. 

**14. CI/CD**  
Created a new repository: `cloud-resume-challenge`

Created a new file: `front-end-cicd.yaml`. Added yaml code:
```yaml
name : Upload webiste to S3

on : 
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@master
      - uses: jakejarvis/s3-sync-action@master
      with:
          args: --acl public-read --follow-symlinks
      env:
        AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        AWS_REGION: 'us-east-1'
        SOURCE_DIR: 'website'
``` 

_**Issues**_. In VS Code, I used the Git logo to add new commit message. Selected the Git push icon (up arrow on the left panel) to sync changes with my Git repository. The code did not deploy and sync files to S3 because "an error occurred (InvalidAccessKeyId) when cling the ListObjectsV2 operation. It further explained the AWS Access Key I provided did not exist in the records. I confirmed that I did save the AWS S3 bucket, access key ID, and secret access key in my Repository secrets. 

After researched a solution which involved creating new access keys, I decided to use short term credentials instead for improved security.  

Next, I created short term credentials using OpenID Connect (OIDC) for GitHub Actions configuring the following:  
OIDC IAM role - In the AWS console, IAM > Add provider > Provider URL: `https://tokenactions.githubusercontent.com` > Audience: `sts.amazonaws.com`  

IAM Trust policy - Under IAM > Roles > Create role > Trusted entity type: Web identity > Identity provider: `token.actions.githubusercontent.com` > Audience: `sts.amazonaws.com`. Attaching the permissions after completing the trust policy. Insert policy here:  

Permission policy for the IAM role - Create a new customer managed policy in JSON. Insert permissions here:  

GitHub Actions YAML - Replaced old YAML with new YAML using short term credentials for OIDC. 

Commit changes in VS Code and push to repository. 

