terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Use default VPC to keep setup simple
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Subnet in AZ "a" (e.g. ap-south-1a) so t2.micro is supported (not all AZs have t2.micro)
data "aws_subnet" "default_subnets" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

locals {
  subnet_id_az_a = one([for _, s in data.aws_subnet.default_subnets : s.id if s.availability_zone == "${var.aws_region}a"])
}

# Ubuntu 22.04 LTS (Jammy) - available in all regions including ap-south-1
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security group: SSH, HTTP, HTTPS; optionally restrict SSH to my_ip
locals {
  ssh_cidr = (var.my_ip == "" || var.my_ip == "0.0.0.0" || var.my_ip == "0.0.0.0/0") ? "0.0.0.0/0" : "${var.my_ip}/32"
}

resource "aws_security_group" "ims" {
  name        = "ims-ec2-sg"
  description = "Allow SSH, HTTP, HTTPS for IMS dev and prod"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [local.ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# User data: install Docker and Docker Compose plugin
locals {
  user_data = <<-EOT
#!/bin/bash
set -e
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu
EOT
}

resource "aws_instance" "ims_dev" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.ims.key_name
  vpc_security_group_ids = [aws_security_group.ims.id]
  subnet_id              = local.subnet_id_az_a

  user_data = local.user_data

  tags = {
    Name = "ims-shaman-dev"
    Env  = "dev"
  }
}

resource "aws_instance" "ims_prod" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.ims.key_name
  vpc_security_group_ids = [aws_security_group.ims.id]
  subnet_id              = local.subnet_id_az_a

  user_data = local.user_data

  tags = {
    Name = "ims-shaman-prod"
    Env  = "prod"
  }
}

# SSH key pair (upload public key to AWS for EC2)
resource "aws_key_pair" "ims" {
  key_name   = "ims-aws-key"
  public_key = file(pathexpand(var.ssh_public_key_path))
}
