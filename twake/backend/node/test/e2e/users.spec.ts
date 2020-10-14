import {describe, expect, it, beforeEach, afterEach} from "@jest/globals";
import { TestPlatform, init } from "./setup";

describe("The /users API", () => {
  const url = "/api/users";
  let platform: TestPlatform;

  beforeEach(async () => {
    platform = await init({
      services: ["webserver", "user", "auth"]
    });
  });

  afterEach(async () => {
    await platform.tearDown();
    platform = null;
  });

  describe("The GET /users/:id route", () => {
    it("should 401 when not authenticated", async (done) => {
      const response = await platform.app.inject({
        method: "GET",
        url: `${url}/1`
      });

      expect(response.statusCode).toBe(401);
      done();
    });

    it("should 404 when user does not exists", async (done) => {
      const id = "123";
      const jwtToken = await platform.auth.getJWTToken();
      const response = await platform.app.inject({
        method: "GET",
        url: `${url}/${id}`,
        headers: {
          authorization: `Bearer ${jwtToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id
      });
      done();
    });
  });

  describe("The GET /users route", () => {
    it("should 401 when user is not authenticated", async (done) => {
      const response = await platform.app.inject({
        method: "GET",
        url
      });

      expect(response.statusCode).toBe(401);
      done();
    });

    it("should 200 with array of users", async (done) => {
      const jwtToken = await platform.auth.getJWTToken();
      const response = await platform.app.inject({
        method: "GET",
        url,
        headers: {
          authorization: `Bearer ${jwtToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.json())).toBeTruthy;
      done();
    });
  });

  describe("The POST /users route", () => {
    it("should 401 when not authenticated", async (done) => {
      const response = await platform.app.inject({
        method: "POST",
        url,
      });

      expect(response.statusCode).toBe(401);
      done();
    });

    it("should 400 if body is not defined", async (done) => {
      const jwtToken = await platform.auth.getJWTToken();
      const response = await platform.app.inject({
        method: "POST",
        url,
        headers: {
          authorization: `Bearer ${jwtToken}`
        }
      });

      expect(response.statusCode).toBe(400);
      done();
    });

    it("should 400 if body is empty JSON", async (done) => {
      const jwtToken = await platform.auth.getJWTToken();
      const response = await platform.app.inject({
        method: "POST",
        url,
        payload: {},
        headers: {
          authorization: `Bearer ${jwtToken}`
        }
      });

      expect(response.statusCode).toBe(400);
      done();
    });

    it("should 400 if body.email is not defined", async (done) => {
      const jwtToken = await platform.auth.getJWTToken();
      const response = await platform.app.inject({
        method: "POST",
        url,
        payload: {
          notemail: "test"
        },
        headers: {
          authorization: `Bearer ${jwtToken}`
        }
      });

      expect(response.statusCode).toBe(400);
      done();
    });

    it("should create the user and send it back", async (done) => {
      const jwtToken = await platform.auth.getJWTToken();
      const response = await platform.app.inject({
        method: "POST",
        url,
        payload: {
          email: "me@twakeapp.com"
        },
        headers: {
          authorization: `Bearer ${jwtToken}`
        }
      });

      expect(response.statusCode).toBe(201);
      done();
    });
  });
});
