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

## 5. S3 tenant media (`ims-shaman-photos`) — CORS for browser uploads

The web app uploads files **directly to S3** using presigned `PUT` URLs from the API. The bucket must allow your frontend origin.

1. In **S3** → bucket `ims-shaman-photos` → **Permissions** → **Cross-origin resource sharing (CORS)**.
2. Add a configuration like (replace `https://app.example.com` with your real app origin(s)):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedOrigins": ["https://app.example.com", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

- **PUT** is required for presigned uploads.
- **GET** / **HEAD** support loading public objects in the browser.
- If the SDK sends extra headers (e.g. `x-amz-*`), `AllowedHeaders: ["*"]` keeps configuration simple; tighten in production if you prefer.

API environment variables (see `apps/api/.env.example`):

- **Core:** `AWS_REGION`, `PHOTOS_S3_BUCKET`, `PHOTOS_PUBLIC_URL_PREFIX`, plus IAM role or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` on the API host.
- **Prefix:** `PHOTOS_S3_KEY_PREFIX` (`dev` | `stage` | `prod`) — first path segment so dev/stage/prod do not overwrite objects. **Required** in staging/production when the bucket is configured (no silent `NODE_ENV` fallback there).
- **Aliases:** `PHOTOS_PUBLIC_URL_ALIASES` — comma-separated public URL prefixes (e.g. CloudFront). Register/finalize accepts a client `publicUrl` only if it matches the canonical URL built from `PHOTOS_PUBLIC_URL_PREFIX` or one of these aliases; the API always persists the primary canonical URL.
- **Startup:** `PHOTOS_S3_VERIFY_ON_STARTUP` — defaults to verifying bucket access (`HeadBucket`) when not in development and S3 is configured; set to `0` / `false` to skip.
- **Hardening / migration:** `PHOTOS_ALLOW_LEGACY_KEYS` — short window to validate old keys of the form `tenants/{tenantId}/...` without the `{env}/` prefix. `PHOTOS_ENFORCE_CONTENT_SNIFF` — optional magic-byte check on register (S3 range read). `IMS_DEPLOYMENT_TIER` is optional documentation-only.

### Presigned PUT behavior

The API signs `PUT` with fixed **Content-Type** and **Content-Length** (exact file size). The browser must send the same headers or S3 returns 4xx. Wrong `PHOTOS_PUBLIC_URL_PREFIX` breaks **links**, not uploads.

### Threat model (high level)

Presigned URLs are time-limited writes to a single object key under a tenant-scoped layout. Tenants authenticate to obtain URLs; the key encodes tenant id and purpose. Operators should use short-lived credentials on the API host and least-privilege IAM (`s3:PutObject`, `s3:DeleteObject`, `s3:GetObject` on the bucket/prefix).

### Orphans and lifecycle

Objects may exist without a `MediaAsset` row if the client uploads but never calls register/finalize. Mitigations: operational metrics (`media.presign.issued` vs `media.register.completed` logs), and optional S3 lifecycle rules on a future `pending/` or `unregistered/` prefix. A full reconcile job is not included in v1.
