# Dockerized Microservice Example

This repository demonstrates the simplest needed way to run a microservice that
uses a database and a messaging middleware, PostgreSQL and RabbitMQ, in this
case.

## Getting started

Make sure you have [installed Docker][1] for your operating system. That's
super important because Docker. 😉

(If you're installing Docker on Linux, make sure you go through the
[post-installation steps][2] so you don't have to `sudo` everything.)

### Get the infrastructure containers

This project uses the official Docker images for [PostgreSQL][3] and
[RabbitMQ][4]. You can get them to your machine by _pulling_ them from the
official Docker Hub. (The versions are the latest stable versions as of the
writing of this advice.)

```sh
docker image pull rabbitmq:3
```

and

```
docker image pull postgres:13
```

### Make sure they're there

Run `docker image list` to show the images that you have installed. You should
see the following repository and tag entries in the list.

```
REPOSITORY    TAG  ...
postgres      13   ...
rabbitmq      3    ...
```

## Running the application

The application can run on your machine, or can run in a container, because it
uses environment variables to connect to the different infrastructure
components, and falls back to `localhost` when environment variables cannot be
found. The two environment variables are:

* `RABBITMQ_HOST`
* `POSTGRESQL_HOST`

Take a moment to look in [server.js][5] on **lines 6 - 7** to see what the use of environment variables to connect to RabbitMQ and PostgreSQL. You can see they both default to the value "localhost" when there is no environment variable.

## Before you run the Node.js application

You need to start the RabbitMQ and PostgreSQL servers before you run the
application. You can do that with the following commands. (Make sure you run
them in the top-level directory of this project.)

```sh
docker run --detach \
           --hostname mq \
           --name mq \
           --publish 5672:5672 \
           rabbitmq:3
```

and

```sh
docker run --detach \
           --hostname pg \
           --name pg \
           --publish 5432:5432 \
           --env "POSTGRES_PASSWORD=secret123" \
           --volume `pwd`/data:/var/lib/postgresql/data \
           postgres:13
```

(More about the environment variable and `--volume` parameters can be found on the [PostgreSQL Docker documentation page][3].)

To initialize the database for the application, run the following commands.
When prompted for the password, it's _secret123_ as shows in the previous
command.

```sh
psql -h localhost \
     -U postgres \
     -c "create database dockerized_example;" \
     postgres
```

and

```sh
psql -h localhost \
     -U postgres \
     -c "create table messages (id serial primary key, message jsonb)" \
     dockerized_example
```

Now, everything is ready for the Node.js application to run.

### Running outside of a container

Make sure you install the Node.js dependencies for the application before
running.

```sh
npm install
```

To run the application without the container, you can just use the `npm`
command and all should start fine.

```sh
npm start
```

You can check that it works by sending a POST HTTP request to
http://localhost:3000 with any JSON body. It should return the same message but
with the value of an id from the database.

### Running inside of a container

There's a Dockerfile available in this project. Build the container for this
project using the following command.

```sh
docker build --tag dockerized_microservice .
```

Then, you need to figure out the IP addresses for PostgreSQL and RabbitMQ so
you can pass them into the Dockerized application from the `docker run`
command. To determine a container's IP address, you can use the `docker network
inspect` command to find the connected containers.

```sh
docker network inspect bridge
```

In the resulting JSON, you should see the "Containers". It should have at least
two entries. Find the ones for "mq" and "pg". Note the values for the
corresponding "IPv4Address" keys for those entries.

Now, run the following command substituting the IPv4 addresses you just got in
the appropriate place.

```sh
docker run --publish 3000:3000 \
           --env "RABBITMQ_HOST=«IPv4 address for mq»" \
           --env "POSTGRESQL_HOST=«IPv4 address for pg»" \
           --detach \
           --name dm \
           --hostname dm \
           dockerized_microservice
```

You can check that it still works by sending a POST HTTP request to
http://localhost:3000 with any JSON body. It should return the same message but
with the value of an id from the database. But, this time, the application is running inside its own Docker container.

## Clean up

If you want to clean up all of the stuff you've done, here, run the following commands.

```sh
docker container stop mq pg dm
```

```sh
docker container rm mq pg dm
```

```sh
docker image rm dockerized_microservice postgres:13 rabbitmq:3
```

```sh
rm -rf ./data
```

[1]: https://docs.docker.com/get-docker/
[2]: https://docs.docker.com/engine/install/linux-postinstall/
[3]: https://hub.docker.com/_/postgres
[4]: https://hub.docker.com/_/rabbitmq
[5]: ./server.js
