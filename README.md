# Protocol Designer

## Description
This tool allows you to visually design network protocol headers or whole protocol stacks with encapsulation. It supports export to SVG and P4. 

![app_protocoledit(1)](https://github.com/filipskrabak/protocol-designer/assets/51746069/882aab3c-1d41-4f7f-b5b3-f85f842f40a9)

## Features

Current list of features:

- [x] Creating a new protocol
- [x] Editing, resizing, removing a protocol field
- [x] Setting possible values to a field (field options)
- [x] Protocol properties (author, description, etc)
- [x] Uploading a protocol SVG (with protocol definition)
- [x] Exports
    - [x] Export to SVG
    - [x] Export to P4
- [x] Encapsulation support (link your protocols)
    - [x] Related fields and field options
    - [x] Related fields highlighting
    - [x] Breadcrumbs and visualization (navigate through your stack easily)
- [x] Protocol settings
    - [x] Bits displayed per row
    - [x] Pixels per bit
    - [x] Toggle scale display
    - [x] Truncate variable length fields
- [x] User login
- [x] Protocol library


## Getting Started

### Prerequisites
This project is using Docker. To be able to run it, you need to have it installed.

- Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Linux: [Follow Installation Instructions](https://docs.docker.com/engine/install/debian/)

### Installation
1. Clone this repository
``` git clone https://github.com/filipskrabak/protocol-designer.git ```

2. Setup `.env` file according to `.env.example`

3. Rename `apache.conf.example` inside the `frontend` folder to `apache.conf`

4. Ensure that Docker is running

5. Make sure that you are inside the project root folder `./protocol-designer` where `docker-compose.yml` is present

6. Run the project with ```docker compose up --build``` (this might take a while for the first time!)

7. Open `http://localhost/` and register an account. 

8. Enjoy! For the user guide, continue to [the user guide](#usage-user-guide)

### Usage (User Guide)

This section explains the basics on how to use this application.

1. You need to register an account by clicking "Sign up now" on the landing page. You can use any email you want.

2. After registering, you are now free to log in with your credentials. 

3. After logging in, you can either create a new project, upload an existing SVG or choose a protocol from the library. Choose "Start a new project"

4. Now you can create a protocol. Start by creating your first field (the round plus button). 

5. You can set protocol properties, such as its name, in the properties tab. Don't forget to click save.

6. Now you can export your protocol by clicking the "Export" button on the top right.

7. Great! Your SVG is now downloaded. You can continue to videos below which show basic and a bit more advanced usage of this tool.

### Usage (videos)

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


## Documentation

Documentation is available in [the wiki of this repository](https://github.com/filipskrabak/protocol-designer/wiki/Technical-Documentation)

## Acknowledgment

This project has been supervised by [Jakub Dubec](https://github.com/Sibyx), whose guidance and ideas have been extremely valuable throughtout the development. 

Special thanks goes to the [Faculty of Informatics and Information Technologies](https://www.fiit.stuba.sk) at the Slovak University of Technology for providing hosting for this project.

![fiit](https://github.com/filipskrabak/protocol-designer/assets/51746069/e824dc0b-8666-4662-853b-c7364234e823)
