# = H°Ûng D«n Sí Dång HÇ ThÑng Phân QuyÁn

## =Ë Måc låc
1. [TÕng quan hÇ thÑng phân quyÁn](#tÕng-quan)
2. [Cách sí dång cho Developer](#developer)
3. [Cách sí dång cho Admin](#admin)
4. [Ví då thñc t¿](#examples)

---

## <¯ TÕng quan hÇ thÑng phân quyÁn <a name="tÕng-quan"></a>

HÇ thÑng phân quyÁn cça b¡n ho¡t Ùng theo mô hình **RBAC** (Role-Based Access Control):

### C¥u trúc:
```
User ’ Role ’ Permission ’ UI Element
```

### Permissions trong database:

| Mã Permission | Mô t£ | Trang | Lo¡i |
|--------------|-------|-------|------|
| `forecast` | Truy c­p trang Dñ báo | `/dashboard/dubaomatrung` | page |
| `forecast.auto` | Sí dång dñ báo tñ Ùng | - | feature |
| `forecast.custom` | Sí dång dñ báo tùy bi¿n | - | feature |
| `data_management` | Truy c­p trang Qu£n lı dï liÇu | `/dashboard/quanlydulieu` | page |
| `data_management.view` | Xem dï liÇu | - | action |
| `data_management.edit` | ChÉnh sía dï liÇu | - | action |
| `data_management.delete` | Xóa dï liÇu | - | action |
| `data_management.export` | Xu¥t dï liÇu | - | action |
| `data_management.import` | Nh­p dï liÇu | - | action |
| `reports` | Truy c­p trang Báo cáo | `/dashboard/baocao` | page |
| `reports.view` | Xem báo cáo | - | action |
| `reports.create` | T¡o báo cáo | - | action |
| `reports.export` | Xu¥t báo cáo | - | action |
| `detection` | Truy c­p trang Phát hiÇn | `/dashboard/phathienmatrung` | page |
| `detection.view` | Xem phát hiÇn | - | action |
| `detection.verify` | Xác minh | - | action |
| `detection.reject` | Të chÑi | - | action |
| `detection.analyze` | Phân tích | - | feature |
| `user_management` | Truy c­p Qu£n lı ng°İi dùng | `/dashboard/quanlynguoidung` | page |
| `user_management.view` | Xem ng°İi dùng | - | action |
| `user_management.create` | T¡o ng°İi dùng | - | action |
| `user_management.edit` | Sía ng°İi dùng | - | action |
| `user_management.delete` | Xóa ng°İi dùng | - | action |
| `user_management.assign_roles` | Phân quyÁn | - | action |
| `role_management` | Truy c­p Qu£n lı Role | `/dashboard/quanlyrole` | page |
| `role_management.view` | Xem roles | - | action |
| `role_management.create` | T¡o role | - | action |
| `role_management.edit` | Sía role | - | action |
| `role_management.delete` | Xóa role | - | action |
| `role_management.assign_permissions` | Phân quyÁn chi ti¿t | - | action |

---

## =h=» H°Ûng d«n cho Developer <a name="developer"></a>

### 1. B£o vÇ toàn bÙ trang (Page Level)

Sí dång `PermissionProtectedRoute` trong `App.jsx`:

```jsx
// client/src/App.jsx
import PermissionProtectedRoute from "./components/PermissionProtectedRoute";
import QuanLyDuLieu from "./dashboard/pages/QuanLyDuLieu";

<Route
  path="quanlydulieu"
  element={
    <PermissionProtectedRoute requiredPermission="data_management">
      <QuanLyDuLieu />
    </PermissionProtectedRoute>
  }
/>
```

** K¿t qu£**: N¿u user không có quyÁn `data_management`, s½ th¥y màn hình "Không có quyÁn truy c­p"

---

### 2. ¨n/hiÇn các nút b¥m trong trang (Action Level)

#### **Cách 1: Sí dång `PermissionGuard` component**

```jsx
import { PermissionGuard } from '../components/PermissionGuard';

function QuanLyDuLieu() {
  return (
    <div>
      <h1>Qu£n lı dï liÇu</h1>

      {/* ChÉ hiÃn thË button "Thêm" n¿u có quyÁn create */}
      <PermissionGuard permission="data_management.edit">
        <button onClick={handleEdit}>
          ChÉnh sía
        </button>
      </PermissionGuard>

      {/* ChÉ hiÃn thË button "Xóa" n¿u có quyÁn delete */}
      <PermissionGuard permission="data_management.delete">
        <button onClick={handleDelete}>
          Xóa
        </button>
      </PermissionGuard>

      {/* HiÃn thË message n¿u không có quyÁn */}
      <PermissionGuard
        permission="data_management.export"
        fallback={<span>B¡n không có quyÁn xu¥t dï liÇu</span>}
      >
        <button onClick={handleExport}>
          Xu¥t Excel
        </button>
      </PermissionGuard>
    </div>
  );
}
```

#### **Cách 2: Sí dång `usePermission` hook**

```jsx
import { usePermission } from '../hooks/usePermission';

function QuanLyDuLieu() {
  const { hasPermission, hasAnyPermission } = usePermission();

  return (
    <div>
      {/* KiÃm tra 1 quyÁn */}
      {hasPermission('data_management.edit') && (
        <button onClick={handleEdit}>ChÉnh sía</button>
      )}

      {/* KiÃm tra nhiÁu quyÁn (chÉ c§n 1) */}
      {hasAnyPermission(['data_management.edit', 'data_management.create']) && (
        <button>Action</button>
      )}
    </div>
  );
}
```

#### **Cách 3: Sí dång `PermissionButton` component** (dÅ nh¥t)

```jsx
import { PermissionButton } from '../components/PermissionGuard';

function QuanLyDuLieu() {
  return (
    <div>
      {/* Button tñ ©n n¿u không có quyÁn */}
      <PermissionButton
        permission="data_management.edit"
        onClick={handleEdit}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        ChÉnh sía
      </PermissionButton>

      <PermissionButton
        permission="data_management.delete"
        onClick={handleDelete}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        Xóa
      </PermissionButton>
    </div>
  );
}
```

---

### 3. KiÃm tra nhiÁu permissions

#### **OR Logic** (chÉ c§n 1 trong các quyÁn):
```jsx
// HiÃn thË n¿u có quyÁn edit HO¶C create
<PermissionGuard permissions={['data_management.edit', 'data_management.create']}>
  <button>Action</button>
</PermissionGuard>
```

#### **AND Logic** (c§n t¥t c£ các quyÁn):
```jsx
// HiÃn thË n¿u có quyÁn view VÀ edit
<PermissionGuard
  permissions={['data_management.view', 'data_management.edit']}
  requireAll={true}
>
  <button>Advanced Action</button>
</PermissionGuard>
```

---

### 4. KiÃm tra theo Role

```jsx
// ChÉ hiÃn thË cho admin
<PermissionGuard roles={['super_admin', 'admin']}>
  <button>Admin Only</button>
</PermissionGuard>
```

---

## =' Ví då thñc t¿ áp dång <a name="examples"></a>

### Ví då 1: Trang Qu£n lı Ng°İi Dùng

```jsx
// client/src/dashboard/pages/QuanLyNguoiDung.jsx
import { PermissionGuard, PermissionButton } from '../../components/PermissionGuard';
import { usePermission } from '../../hooks/usePermission';

function QuanLyNguoiDung() {
  const { hasPermission } = usePermission();

  return (
    <div className="p-6">
      {/* Header vÛi button Thêm */}
      <div className="flex justify-between mb-4">
        <h1>Qu£n lı Ng°İi Dùng</h1>

        <PermissionButton
          permission="user_management.create"
          onClick={() => setShowModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          <FaUserPlus className="mr-2" />
          Thêm ng°İi dùng
        </PermissionButton>
      </div>

      {/* B£ng danh sách */}
      <table>
        <thead>
          <tr>
            <th>Tên</th>
            <th>Email</th>
            {hasPermission('user_management.edit') && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.full_name}</td>
              <td>{user.email}</td>

              {/* CÙt thao tác chÉ hiÃn thË n¿u có quyÁn */}
              {hasPermission('user_management.edit') && (
                <td>
                  <PermissionButton
                    permission="user_management.edit"
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 mr-2"
                  >
                    <FaEdit />
                  </PermissionButton>

                  <PermissionButton
                    permission="user_management.delete"
                    onClick={() => handleDelete(user)}
                    className="text-red-600"
                  >
                    <FaTrash />
                  </PermissionButton>

                  <PermissionButton
                    permission="user_management.assign_roles"
                    onClick={() => handleAssignRoles(user)}
                    className="text-green-600 ml-2"
                  >
                    <FaUserTag />
                  </PermissionButton>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Ví då 2: Trang Báo cáo vÛi nhiÁu actions

```jsx
// client/src/dashboard/pages/ThongKeBaoCaoMatRung.jsx
import { PermissionButton } from '../../components/PermissionGuard';

function ThongKeBaoCaoMatRung() {
  return (
    <div>
      <div className="action-bar flex gap-2">
        <PermissionButton
          permission="reports.create"
          onClick={handleCreateReport}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          T¡o báo cáo mÛi
        </PermissionButton>

        <PermissionButton
          permission="reports.export"
          onClick={handleExportToExcel}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Xu¥t Excel
        </PermissionButton>
      </div>
    </div>
  );
}
```

---

## =d H°Ûng d«n cho Admin <a name="admin"></a>

### Cách phân quyÁn cho User:

1. **ng nh­p vÛi tài kho£n Admin**
2. **Vào trang "Qu£n lı Role"** (`/dashboard/quanlyrole`)
3. **ChÍn Role c§n phân quyÁn** ’ Click nút "Phân quyÁn"
4. **Tích chÍn các quyÁn** theo tëng module:
   - **Module Dï liÇu**: Tích vào `data_management.view`, `data_management.edit`...
   - **Module Báo cáo**: Tích vào `reports.view`, `reports.create`...
5. **L°u l¡i**

### K¿t qu£:
- User thuÙc Role ó s½ **CHÈ th¥y** các trang/button mà hÍ có quyÁn
- Các trang/button không có quyÁn s½ **Tğ ØNG ¨N**

---

## =İ Checklist cho Developer

Khi phát triÃn tính nng mÛi, hãy làm theo các b°Ûc sau:

- [ ] **B°Ûc 1**: Thêm permission vào database
  ```sql
  INSERT INTO "Permission" (code, name, module, resource, action, ui_category, ui_element, ui_path)
  VALUES ('my_feature.view', 'Xem tính nng', 'my_module', 'my_resource', 'read', 'main_menu', 'action', '/dashboard/myfeature');
  ```

- [ ] **B°Ûc 2**: B£o vÇ route trong `App.jsx`
  ```jsx
  <Route path="myfeature" element={
    <PermissionProtectedRoute requiredPermission="my_feature">
      <MyFeature />
    </PermissionProtectedRoute>
  } />
  ```

- [ ] **B°Ûc 3**: ¨n/hiÇn các button trong component
  ```jsx
  <PermissionButton permission="my_feature.create" onClick={handleCreate}>
    T¡o mÛi
  </PermissionButton>
  ```

- [ ] **B°Ûc 4**: Test vÛi user không có quyÁn Ã £m b£o UI bË ©n

---

## S Câu hÏi th°İng g·p

**Q: Làm sao Ã user vëa vào trang ã th¥y úng các button hÍ có quyÁn?**
A: Sí dång `PermissionButton` ho·c `PermissionGuard`. Component s½ tñ Ùng kiÃm tra permission të JWT token và ©n/hiÇn tñ Ùng.

**Q: Có c§n gÍi API Ã kiÃm tra permission không?**
A: Không c§n! Permission ã °ãc l°u trong JWT token khi login. Frontend chÉ c§n Íc të `user.permissions` trong AuthContext.

**Q: Admin th¥y t¥t c£ hay ph£i c¥p quyÁn cho Admin?**
A: Admin (role `super_admin`) tñ Ùng có t¥t c£ quyÁn. Hook `usePermission` ã xí lı logic này.

**Q: Làm sao Ã mÙt button c§n nhiÁu quyÁn?**
A: Dùng `permissions` prop vÛi m£ng:
```jsx
<PermissionButton permissions={['perm1', 'perm2']} requireAll={true}>
  Advanced Action
</PermissionButton>
```

---

## <‰ K¿t lu­n

HÇ thÑng phân quyÁn cça b¡n ã **hoàn chÉnh** vÛi:
 Database structure tÑt
 Backend middleware kiÃm tra permission
 Frontend hooks & components tiÇn lãi
 DÅ dàng mß rÙng cho các tính nng mÛi

**Bây giİ chÉ c§n áp dång vào tëng trang Ã hoàn thiÇn!** =€
