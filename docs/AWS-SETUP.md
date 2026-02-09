# AWS Account and EC2 Access Setup

Follow these steps once before running Terraform. You need an AWS account and an SSH key for EC2.

## 1. Create an AWS account (if needed)

1. Go to [aws.amazon.com](https://aws.amazon.com) and sign up.
2. Complete verification (email, payment method; free tier does not charge for eligible usage).
3. Enable **MFA** on the root account (recommended): IAM → Users → your root → Security credentials → Assign MFA.
4. (Optional) Set a **billing alert** in Billing → Budgets → Create budget (e.g. alert when cost &gt; $5).

## 2. Create an IAM user (for Terraform / future use)

GitHub does **not** need AWS credentials for the Watchtower-based flow (GitHub only pushes to Docker Hub). Create an IAM user only if you will run Terraform from your machine or use AWS CLI.

1. In AWS Console go to **IAM** → **Users** → **Create user**.
2. User name: e.g. `ims-terraform` or `github-deploy`.
3. **Access type**: enable **Programmatic access**.
4. **Permissions**: Attach policy **AmazonEC2FullAccess** (or a custom policy that allows EC2, VPC, and key pairs). You can tighten this later.
5. Create user, then **Create access key**.
6. Save the **Access key ID** and **Secret access key** somewhere secure. Configure them locally:
   - **Option A**: `aws configure` (uses `~/.aws/credentials`).
   - **Option B**: Environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` when running `terraform plan/apply`.

## 3. Create an SSH key pair for EC2

Terraform will inject the **public** key into EC2 so you can SSH with the **private** key.

**On your Mac (in a terminal):**

```bash
# Generate an ED25519 key (no passphrase for simplicity; use -N "" or add -N "your-passphrase" for security)
ssh-keygen -t ed25519 -C "ims-aws" -f ~/.ssh/ims-aws -N ""

# Show the public key (you will use this in Terraform)
cat ~/.ssh/ims-aws.pub
```

- **Private key**: `~/.ssh/ims-aws` — keep this secret; do not commit it.
- **Public key**: `~/.ssh/ims-aws.pub` — you will set this in Terraform (e.g. `infra/terraform.tfvars` or variable `ssh_public_key_path`).

To SSH to EC2 later:

```bash
ssh -i ~/.ssh/ims-aws ubuntu@<EC2-PUBLIC-IP>
```

## 4. (Optional) Restrict SSH to your IP in Terraform

In `infra/variables.tf` you can set `my_ip` to your current public IP so the security group allows SSH only from your machine. Terraform will use it for the SSH rule.

---

**Next:** Run Terraform from the `infra/` directory (see [infra/README.md](../infra/README.md)).
