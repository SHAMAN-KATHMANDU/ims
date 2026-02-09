variable "aws_region" {
  description = "AWS region (e.g. ap-south-1 for Mumbai)"
  type        = string
  default     = "ap-south-1"
}

variable "ssh_public_key_path" {
  description = "Path to the public SSH key file for EC2 access (e.g. ~/.ssh/ims-aws.pub)"
  type        = string
}

variable "my_ip" {
  description = "Your public IP for SSH access (e.g. from https://ifconfig.me). Use \"\" to allow any IP (not recommended for production)."
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "EC2 instance type (t2.micro / t3.micro for free tier)"
  type        = string
  default     = "t2.micro"
}

