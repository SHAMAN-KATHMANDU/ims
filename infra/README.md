# IMS AWS Infrastructure (Terraform)

This folder defines two EC2 instances (dev and prod) with Docker and Docker Compose installed via user_data.

## Prerequisites

1. [AWS account and IAM user](../docs/AWS-SETUP.md) with programmatic access.
2. [SSH key pair](../docs/AWS-SETUP.md#3-create-an-ssh-key-pair-for-ec2) generated; you will use the **public** key path in Terraform.
3. [Terraform](https://developer.hashicorp.com/terraform/downloads) installed (e.g. `brew install terraform` on macOS).

## Configure AWS credentials

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
# Or: aws configure
```

## Use Terraform

1. Copy the example tfvars and set your values:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars: ssh_public_key_path, my_ip (optional)
   ```

2. Initialize and apply:

   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

3. Note the outputs (dev/prod public IPs and SSH commands). Use them to copy the `deploy/` files and run Docker Compose (see [deploy/README.md](../deploy/README.md)).

## What gets created

- **Security group** `ims-ec2-sg`: inbound 22 (SSH), 80 (HTTP), 443 (HTTPS); outbound all.
- **Two EC2 instances** (Ubuntu 24.04, t3.micro by default):
  - `ims-shaman-dev`
  - `ims-shaman-prod`
- **Key pair** `ims-aws-key` using your public key.

Each instance runs a user_data script that installs Docker and the Docker Compose plugin.
