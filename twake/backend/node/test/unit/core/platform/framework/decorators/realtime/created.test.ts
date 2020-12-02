import { describe, expect, it, jest } from "@jest/globals";
import { CreateResult } from "../../../../../../../src/core/platform/framework/api/crud-service";
import { RealtimeCreated } from "../../../../../../../src/core/platform/framework/decorators";
import { eventBus } from "../../../../../../../src/core/platform/services/realtime/bus";
import { ResourcePath } from "../../../../../../../src/core/platform/services/realtime/types";

describe("The RealtimeCreated decorator", () => {
  it("should call the original method send back original result but do not emit event if result type is wrong", async done => {
    const emitSpy = jest.spyOn(eventBus, "emit");

    class TestMe {
      @RealtimeCreated("/foo/bar")
      reverseMeBaby(input: string): Promise<string> {
        return Promise.resolve(input.split("").reverse().join(""));
      }
    }

    const test = new TestMe();
    const originalSpy = jest.spyOn(test, "reverseMeBaby");
    const result = await test.reverseMeBaby("yolo");

    expect(result).toEqual("oloy");
    expect(originalSpy).toHaveBeenCalledTimes(1);
    expect(originalSpy).toHaveBeenCalledWith("yolo");
    expect(emitSpy).toHaveBeenCalledTimes(0);

    emitSpy.mockRestore();
    done();
  });

  it("should call the original method send back original result and emit event", async done => {
    const emitSpy = jest.spyOn(eventBus, "emit");

    class TestMe {
      @RealtimeCreated("/foo/bar", "/foo/bar/baz")
      async reverseMeBaby(input: string): Promise<CreateResult<string>> {
        return new CreateResult<string>("string", input.split("").reverse().join(""));
      }
    }

    const test = new TestMe();
    const originalSpy = jest.spyOn(test, "reverseMeBaby");
    const result = await test.reverseMeBaby("yolo");

    expect(result.entity).toEqual("oloy");
    expect(originalSpy).toHaveBeenCalledTimes(1);
    expect(originalSpy).toHaveBeenCalledWith("yolo");
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith("created", {
      room: {
        name: "default",
        path: ["/foo/bar"],
      } as ResourcePath,
      resourcePath: "/foo/bar/baz",
      entity: "oloy",
      type: "string",
      result: {
        entity: "oloy",
        type: "string",
        context: undefined,
        operation: "create",
        raw: undefined,
      } as CreateResult<string>,
    });

    emitSpy.mockRestore();
    done();
  });

  it("should emit event with path computed from function", async done => {
    const emitSpy = jest.spyOn(eventBus, "emit");

    class TestMe {
      @RealtimeCreated<string>(input => ResourcePath.get(`/foo/bar/${input}`), "/foo/bar/baz")
      async reverseMeBaby(input: string): Promise<CreateResult<string>> {
        return new CreateResult<string>("string", input.split("").reverse().join(""));
      }
    }

    const test = new TestMe();
    const originalSpy = jest.spyOn(test, "reverseMeBaby");
    const result = await test.reverseMeBaby("yolo");

    expect(result.entity).toEqual("oloy");
    expect(originalSpy).toHaveBeenCalledTimes(1);
    expect(originalSpy).toHaveBeenCalledWith("yolo");
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith("created", {
      room: {
        name: "default",
        path: ["/foo/bar/oloy"],
      } as ResourcePath,
      resourcePath: "/foo/bar/baz",
      entity: "oloy",
      type: "string",
      result: {
        entity: "oloy",
        context: undefined,
        operation: "create",
        type: "string",
        raw: undefined,
      } as CreateResult<string>,
    });

    emitSpy.mockRestore();
    done();
  });
});
