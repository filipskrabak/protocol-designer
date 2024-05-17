# Protocol Designer

## Description
This tool allows you to visually design network protocol headers or whole protocol stacks with encapsulation. It supports export to SVG or P4. 

## Features

Current list of features:

## Getting Started

### Prerequisites
This project is using Docker. To be able to run it, you need to have it installed.

- Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Linux: [Follow Installation Instructions](https://docs.docker.com/engine/install/debian/)

### Installation
1. Clone this repository
``` git clone https://github.com/filipskrabak/protocol-designer.git ```

2. Setup `.env` file according to `.env.example`

3. Ensure that Docker is running

4. Make sure that you are inside the project root folder `./protocol-designer` where `docker-compose.yml` is present

5. Run the project with ```docker compose up --build``` (this might take a while for the first time!)

6. Open `http://localhost/` and register an account. 

7. Enjoy!

### Usage

1. Creating a new protocol

https://github.com/filipskrabak/protocol-designer/assets/51746069/c18e28d9-853f-4b57-a026-a394e7a7c62c

2. Editing field options, resizing, removing protocol fields

https://github.com/filipskrabak/protocol-designer/assets/51746069/54d31104-8862-4ba5-89f4-077c352218a0

3. Exporting a protocol to SVG

https://github.com/filipskrabak/protocol-designer/assets/51746069/24ec0fe1-7207-4b16-a80b-a4917a78ca6a

4. Uploading an existing protocol SVG

https://github.com/filipskrabak/protocol-designer/assets/51746069/e77e9ba9-d36d-4a05-9906-b695276eb8f3

5. Encapsulation showcase

https://github.com/filipskrabak/protocol-designer/assets/51746069/a3278d74-a9fa-40ec-b1e4-4083448c24d0


