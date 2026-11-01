import { test, expect } from "./fixtures";

test("department and Team changes refresh open organization pages in realtime", async ({
  page,
}) => {
  const departmentName = `UI Department ${Date.now()}`;
  const teamAName = `UI Team A ${Date.now()}`;
  const teamBName = `UI Team B ${Date.now()}`;
  const managerId = "00000000-0000-4000-8000-000000000101";
  const memberId = "00000000-0000-4000-8000-000000000102";

  await page.goto("/hr-management/organization/departments");
  const secondPage = await page.context().newPage();
  await secondPage.goto("/hr-management/organization/departments");

  const departmentResponse = await page.request.post(
    "http://localhost:3117/api/v1/departments",
    {
      data: {
        name: departmentName,
        administratorIds: [managerId],
        accessUserIds: [],
        accessGroupIds: [],
      },
    },
  );
  expect(departmentResponse.status()).toBe(201);
  const department = await departmentResponse.json();
  await expect(
    secondPage.getByRole("link", { name: departmentName, exact: true }),
  ).toBeVisible();

  const teamAResponse = await page.request.post(
    "http://localhost:3117/api/v1/teams",
    {
      data: {
        name: teamAName,
        departmentId: department.id,
        managerIds: [managerId],
        memberUserIds: [memberId],
        memberGroupIds: [],
      },
    },
  );
  expect(teamAResponse.status()).toBe(201);
  const teamA = await teamAResponse.json();

  await secondPage.goto(`/hr-management/organization/teams/${teamA.id}`);
  await secondPage.getByRole("tab", { name: "Thành viên" }).click();
  await expect(
    secondPage.getByRole("heading", { name: "Nhân viên (2)" }),
  ).toBeVisible();
  await expect(
    secondPage.getByText("Trần Thị B", { exact: true }),
  ).toBeVisible();

  const previewResponse = await page.request.post(
    `http://localhost:3117/api/v1/departments/${department.id}/team-transfer-preview`,
    { data: { userIds: [memberId] } },
  );
  expect(previewResponse.status()).toBe(201);
  const preview = await previewResponse.json();
  expect(preview.transfers[0].oldTeamId).toBe(teamA.id);
  expect(preview.transfers[0].oldTeamName).toBe(teamAName);

  const teamBResponse = await page.request.post(
    "http://localhost:3117/api/v1/teams",
    {
      data: {
        name: teamBName,
        departmentId: department.id,
        managerIds: [managerId],
        memberUserIds: [memberId],
        memberGroupIds: [],
        confirmTransferUserIds: [memberId],
      },
    },
  );
  expect(teamBResponse.status()).toBe(201);
  await expect(
    secondPage.getByRole("heading", { name: "Nhân viên (1)" }),
  ).toBeVisible();
  await expect(secondPage.getByText("Trần Thị B", { exact: true })).toHaveCount(
    0,
  );
  await secondPage.close();
});
