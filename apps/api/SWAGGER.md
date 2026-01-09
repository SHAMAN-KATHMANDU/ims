# Swagger API Documentation

Swagger/OpenAPI documentation has been integrated into the API for easy testing and exploration.

## Accessing Swagger UI

Once the server is running, access the Swagger UI at:

```
http://localhost:4000/api-docs
```

## Features

- **Interactive API Testing**: Test all endpoints directly from the browser
- **Authentication Support**: Use the "Authorize" button to add your JWT token
- **Request/Response Examples**: See example requests and responses for each endpoint
- **Schema Definitions**: View data models and their properties

## How to Use

### 1. Start the Server

```bash
cd apps/api
pnpm dev
```

### 2. Access Swagger UI

Open your browser and navigate to:
```
http://localhost:4000/api-docs
```

### 3. Authenticate

1. First, use the `/auth/login` endpoint to get a JWT token
2. Click the **"Authorize"** button at the top of the Swagger UI
3. Enter your token in the format: `Bearer YOUR_TOKEN_HERE` or just `YOUR_TOKEN_HERE`
4. Click **"Authorize"** and then **"Close"**

### 4. Test Endpoints

- Click on any endpoint to expand it
- Click **"Try it out"** to enable editing
- Fill in the required parameters/request body
- Click **"Execute"** to send the request
- View the response below

## Documented Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - User logout

### Categories
- `POST /categories` - Create category (admin/superAdmin)
- `GET /categories` - Get all categories
- `GET /categories/{id}` - Get category by ID
- `PUT /categories/{id}` - Update category (admin/superAdmin)
- `DELETE /categories/{id}` - Delete category (admin/superAdmin)

### Products
- `POST /products` - Create product (admin/superAdmin)
- `GET /products` - Get all products
- `GET /products/{id}` - Get product by ID
- `PUT /products/{id}` - Update product (admin/superAdmin)
- `DELETE /products/{id}` - Delete product (admin/superAdmin)
- `GET /products/categories/list` - Get all categories (helper)
- `GET /products/discount-types/list` - Get all discount types (helper)

## Tips

1. **Token Management**: After logging in, copy the token from the response and use it in the Authorize dialog
2. **Test Flow**: 
   - Login → Get token → Authorize → Test protected endpoints
3. **Error Responses**: Swagger shows all possible error responses for each endpoint
4. **Request Bodies**: Use the example values provided or modify them as needed

## Configuration

Swagger configuration is located in:
- `src/config/swagger.config.ts` - Main Swagger configuration
- Route documentation is added via JSDoc comments in router files

## Customization

To customize Swagger documentation:
1. Edit `src/config/swagger.config.ts` for global settings
2. Modify JSDoc comments in router files for endpoint-specific documentation
3. Restart the server to see changes

---

**Happy Testing! 🚀**
