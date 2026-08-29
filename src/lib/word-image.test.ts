import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatWordImage, parseWordImage } from "./word-image";

describe("word-image", () => {
  it("parses upload URLs into image_id", () => {
    assert.deepEqual(
      parseWordImage("/api/uploads/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"),
      { imageId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", imageRef: null },
    );
  });

  it("parses bare UUIDs into image_id", () => {
    assert.deepEqual(parseWordImage("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"), {
      imageId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      imageRef: null,
    });
  });

  it("stores library ids and public paths as image_ref", () => {
    assert.deepEqual(parseWordImage("builtin-eiffel-tower"), {
      imageId: null,
      imageRef: "builtin-eiffel-tower",
    });
    assert.deepEqual(parseWordImage("/vocab-images/year8/eiffel-tower.jpg"), {
      imageId: null,
      imageRef: "/vocab-images/year8/eiffel-tower.jpg",
    });
  });

  it("clears empty values", () => {
    assert.deepEqual(parseWordImage(""), { imageId: null, imageRef: null });
    assert.deepEqual(parseWordImage(null), { imageId: null, imageRef: null });
  });

  it("formats rows back to client image values", () => {
    assert.equal(
      formatWordImage("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", null),
      "/api/uploads/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    );
    assert.equal(formatWordImage(null, "builtin-eiffel-tower"), "builtin-eiffel-tower");
    assert.equal(formatWordImage(null, null), undefined);
  });
});
