<!-- aisrtable-schema-report.md -->

## Tables, Columns, and Relations

TABLE: Company
  - companyId: autoNumber
  - companyName: singleLineText
  - companyTradingName: singleLineText
  - companyRegistrationNumber: singleLineText
  - companyKraPin: singleLineText
  - companyVatNumber: singleLineText
  - companyPhysicalAddress: multilineText
  - companyCity: singleLineText
  - companyCountry: singleLineText
  - companyPostalCode: singleLineText
  - companyPhoneNumber: phoneNumber
  - companyEmail: email
  - companyWebsite: url
  - companyCurrencyCode: singleLineText
  - companyFiscalYearStartMonth: number (precision=0)
  - companyIndustryType: singleLineText
  - companyStatus: singleSelect (choices=active,suspended,closed)
  - companyRegistrationDate: date
  - totalBusinessUnits: number (precision=0)
  - totalEmployeeCount: number (precision=0)
  - createdAt: createdTime
  - updatedAt: lastModifiedTime
  - BusinessUnits: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - PayrollRun: multipleRecordLinks (linkedTableId=tbluXxo0nPbHALg0L)

TABLE: BusinessUnit
  - businessUnitId: autoNumber
  - businessUnitName: singleLineText
  - businessUnitCode: singleLineText
  - companyId: multipleRecordLinks (linkedTableId=tblrmxcv3yI0AKbkD)
  - businessUnitType: singleSelect (choices=retail_store,warehouse,head_office,depot,kiosk)
  - businessUnitPhysicalAddress: multilineText
  - businessUnitCity: singleLineText
  - businessUnitRegion: singleLineText
  - businessUnitPhoneNumber: phoneNumber
  - businessUnitEmail: email
  - businessUnitOpeningDate: date
  - businessUnitMonthlyRentAmount: currency
  - businessUnitSquareMeterage: number (precision=0)
  - businessUnitStatus: singleSelect (choices=active,inactive,closed)
  - totalCumulativeSales: currency
  - totalCumulativeExpenses: currency
  - createdAt: createdTime
  - SystemUser: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - Employee: multipleRecordLinks (linkedTableId=tblBnBVuyW1hmgQiE)
  - EmployeeAttendance: multipleRecordLinks (linkedTableId=tblqbGSjj1XZLfaX1)
  - Customer: multipleRecordLinks (linkedTableId=tblTIPeb585fdOiqx)
  - InventoryStock: multipleRecordLinks (linkedTableId=tbl1U387QsNX2Acr0)
  - InventoryLedger: multipleRecordLinks (linkedTableId=tbliXFcfTMAXpe2rX)
  - InventorySnapshot: multipleRecordLinks (linkedTableId=tblQdq1NcAw1AzQR0)
  - PurchaseOrder: multipleRecordLinks (linkedTableId=tbla3uBOYN7VXco2N)
  - PurchaseOrderDelivery: multipleRecordLinks (linkedTableId=tbljhHyxi42BFMOPA)
  - SalesTarget: multipleRecordLinks (linkedTableId=tblFdJHz6VwwaOhlP)
  - SalesTransaction: multipleRecordLinks (linkedTableId=tblSxHCeySplinNxa)
  - SalesDailyCheck: multipleRecordLinks (linkedTableId=tblkWkXH0KyQy3jGa)
  - DebtorAccount: multipleRecordLinks (linkedTableId=tblyuZyYzer7CboO3)
  - PartialDepositAccount: multipleRecordLinks (linkedTableId=tblTuqx8k9782JqRd)
  - SalaryAccount: multipleRecordLinks (linkedTableId=tbl27XC7KOYs16rWX)
  - AllowanceAccount: multipleRecordLinks (linkedTableId=tbllsfTxMZL238kdA)
  - ExpenseAccount: multipleRecordLinks (linkedTableId=tblUOgeUt0HLOto5D)
  - RentAccount: multipleRecordLinks (linkedTableId=tbltZFYqL2w7qe7ry)
  - DeliveryAccount: multipleRecordLinks (linkedTableId=tblMGlFjMMFBPbR1a)
  - SalesAccount: multipleRecordLinks (linkedTableId=tblDUFQUH3Vu3vA5x)
  - AssetAccount: multipleRecordLinks (linkedTableId=tbl7zrNC8bL5VQQFh)
  - FinanceJournalEntry: multipleRecordLinks (linkedTableId=tblphIXArG6IeOV2M)
  - SystemAuditLog: multipleRecordLinks (linkedTableId=tbl7GiFNtKhDTL4ZN)
  - NotificationLog: multipleRecordLinks (linkedTableId=tbltpPtEc87dkOgl7)

TABLE: Category
  - categoryId: autoNumber
  - categoryName: singleLineText
  - categoryCode: singleLineText
  - categoryDescription: multilineText
  - parentCategoryId: multipleRecordLinks (linkedTableId=tblFI7n9k06BwScTL)
  - categoryStatus: singleSelect (choices=active,inactive)
  - createdAt: createdTime
  - Products: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - From field: parentCategoryId: multipleRecordLinks (linkedTableId=tblFI7n9k06BwScTL)
  - AssetAccount: multipleRecordLinks (linkedTableId=tbl7zrNC8bL5VQQFh)

TABLE: Product
  - productId: autoNumber
  - productName: singleLineText
  - productCode: singleLineText
  - productBarcode: singleLineText
  - categoryId: multipleRecordLinks (linkedTableId=tblFI7n9k06BwScTL)
  - productDescription: multilineText
  - unitOfMeasure: singleSelect (choices=pieces,kg,litres,boxes,cartons,grams,ml)
  - reorderLevel: number (precision=0)
  - reorderQuantity: number (precision=0)
  - currentSellingPrice: currency
  - currentPurchasePrice: currency
  - currentGrossMarginPercent: formula (formula=({flda2HrrrDunn2J92} - {fldHfeHvIEtHqbwbC}) / {flda2HrrrDunn2J92} * 100)
  - priceLastChangedAt: date
  - totalQuantitySold: number (precision=0)
  - totalRevenueGenerated: currency
  - totalProfitGenerated: currency
  - productImageUrl: url
  - productStatus: singleSelect (choices=active,discontinued,out_of_stock,pending)
  - createdAt: createdTime
  - ProductPriceHistory: multipleRecordLinks (linkedTableId=tbl2p8cBVBJbC3P54)
  - InventoryStock: multipleRecordLinks (linkedTableId=tbl1U387QsNX2Acr0)
  - InventoryLedger: multipleRecordLinks (linkedTableId=tbliXFcfTMAXpe2rX)
  - InventorySnapshot: multipleRecordLinks (linkedTableId=tblQdq1NcAw1AzQR0)
  - PurchaseOrderItem: multipleRecordLinks (linkedTableId=tblYDolqpLDizFnFM)
  - PurchaseOrderDeliveryItem: multipleRecordLinks (linkedTableId=tblDoRKWdGJjxQ8fU)
  - SalesTransactionItem: multipleRecordLinks (linkedTableId=tblLgmiBBvsazvlGd)
  - PartialDepositAccount: multipleRecordLinks (linkedTableId=tblTuqx8k9782JqRd)
  - AssetAccount: multipleRecordLinks (linkedTableId=tbl7zrNC8bL5VQQFh)

TABLE: UserRole
  - roleId: autoNumber
  - roleName: singleLineText
  - roleDescription: multilineText
  - isSystemRole: checkbox
  - userCountInRole: count
  - createdAt: createdTime
  - linkedSystemUsers: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - linkedRolePermissions: multipleRecordLinks (linkedTableId=tblBd1iBBHbpq3nD5)

TABLE: SystemUser
  - userId: autoNumber
  - firstName: singleLineText
  - lastName: singleLineText
  - fullName: formula (formula={fldMezLKpsVtiWA8h} & " " & {fldUf2POqOCi7gH6h})
  - emailAddress: email
  - phoneNumber: phoneNumber
  - userRoleId: multipleRecordLinks (linkedTableId=tblTlrrI4fByA4BOl)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - accountStatus: singleSelect (choices=active,suspended,pending,locked)
  - failedLoginCount: number (precision=0)
  - lastFailedLoginAt: dateTime
  - lastSuccessfulLoginAt: dateTime
  - lastActivityAt: dateTime
  - twoFactorEnabled: checkbox
  - mustChangePassword: checkbox
  - createdAt: createdTime
  - linkedUserSessions: multipleRecordLinks (linkedTableId=tblpZDU6fPzc5q4Ho)
  - linkedLoginAuditLogs: multipleRecordLinks (linkedTableId=tbl8evdmC4ChOGYyQ)
  - Employee: multipleRecordLinks (linkedTableId=tblBnBVuyW1hmgQiE)
  - LoanAccount: multipleRecordLinks (linkedTableId=tblo4sUvUyANJDwB7)
  - EmployeeAttendance: multipleRecordLinks (linkedTableId=tblqbGSjj1XZLfaX1)
  - InventoryLedger (authorisedByUserId): multipleRecordLinks (linkedTableId=tbliXFcfTMAXpe2rX)
  - InventoryLedger (createdByUserId): multipleRecordLinks (linkedTableId=tbliXFcfTMAXpe2rX)
  - PurchaseOrder: multipleRecordLinks (linkedTableId=tbla3uBOYN7VXco2N)
  - PurchaseOrderDelivery: multipleRecordLinks (linkedTableId=tbljhHyxi42BFMOPA)
  - SalesTarget: multipleRecordLinks (linkedTableId=tblFdJHz6VwwaOhlP)
  - SalesTransaction: multipleRecordLinks (linkedTableId=tblSxHCeySplinNxa)
  - DebtorPayment: multipleRecordLinks (linkedTableId=tblt3CsdfIo2D55gY)
  - PayrollRun (preparedByUserId): multipleRecordLinks (linkedTableId=tbluXxo0nPbHALg0L)
  - PayrollRun (approvedByUserId): multipleRecordLinks (linkedTableId=tbluXxo0nPbHALg0L)
  - AllowanceAccount: multipleRecordLinks (linkedTableId=tbllsfTxMZL238kdA)
  - ExpenseAccount: multipleRecordLinks (linkedTableId=tblUOgeUt0HLOto5D)
  - SystemAuditLog: multipleRecordLinks (linkedTableId=tbl7GiFNtKhDTL4ZN)

TABLE: RolePermission
  - permissionId: autoNumber
  - roleId: multipleRecordLinks (linkedTableId=tblTlrrI4fByA4BOl)
  - resourceName: singleLineText
  - canRead: checkbox
  - canCreate: checkbox
  - canUpdate: checkbox
  - canDelete: checkbox
  - canApprove: checkbox
  - canExport: checkbox
  - createdAt: createdTime

TABLE: UserSession
  - sessionId: singleLineText
  - userId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - ipAddress: singleLineText
  - deviceType: singleSelect (choices=mobile,desktop,tablet,unknown)
  - loginAt: dateTime
  - lastActiveAt: dateTime
  - logoutAt: dateTime
  - sessionDurationSeconds: number (precision=0)
  - logoutReason: singleSelect (choices=user_logout,timeout,forced,password_change)

TABLE: LoginAuditLog
  - auditLogId: autoNumber
  - userId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - attemptedEmailOrPhone: singleLineText
  - ipAddress: singleLineText
  - attemptResult: singleSelect (choices=success,wrong_password,account_locked,not_found,blocked_ip)
  - attemptedAt: dateTime
  - userAgent: singleLineText

TABLE: OtpStore
  - otpStoreId: autoNumber
  - identifier: singleLineText
  - hashedOtp: singleLineText
  - deliveryChannel: singleSelect (choices=sms,email)
  - expiresAt: dateTime
  - isUsed: checkbox
  - usedAt: dateTime
  - createdAt: createdTime

TABLE: Employee
  - employeeId: autoNumber
  - employeeNumber: singleLineText
  - firstName: singleLineText
  - lastName: singleLineText
  - fullName: formula (formula={fld66dW5fn1O0xqTp} & " " & {fld90YRGZXwoybIIn})
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - systemUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - nationalIdNumber: singleLineText
  - kraPin: singleLineText
  - nssfNumber: singleLineText
  - nhifNumber: singleLineText
  - phoneNumber: phoneNumber
  - emailAddress: singleLineText
  - physicalAddress: multilineText
  - dateOfBirth: date
  - gender: singleSelect (choices=male,female,other)
  - maritalStatus: singleSelect (choices=single,married,divorced,widowed)
  - nextOfKinName: singleLineText
  - nextOfKinPhone: phoneNumber
  - nextOfKinRelationship: singleLineText
  - jobTitle: singleLineText
  - department: singleSelect (choices=Sales,Finance,HR,Operations,Management,IT,Procurement)
  - employmentType: singleSelect (choices=permanent,contract,casual,intern,part_time)
  - startDate: date
  - endDate: date
  - baseSalary: currency
  - bankName: singleLineText
  - bankBranchName: singleLineText
  - bankAccountNumber: singleLineText
  - mpesaPhoneNumber: phoneNumber
  - totalLoanBalance: currency
  - employmentStatus: singleSelect (choices=active,resigned,terminated,suspended,on_leave)
  - createdAt: createdTime
  - EmployeeContract: multipleRecordLinks (linkedTableId=tbly6uop7jFvLbyNB)
  - LoanAccount: multipleRecordLinks (linkedTableId=tblo4sUvUyANJDwB7)
  - EmployeeAttendance: multipleRecordLinks (linkedTableId=tblqbGSjj1XZLfaX1)
  - LoanRepaymentSchedule: multipleRecordLinks (linkedTableId=tblfuO7jXm8sZgi4z)
  - SalaryAccount: multipleRecordLinks (linkedTableId=tbl27XC7KOYs16rWX)
  - AllowanceAccount: multipleRecordLinks (linkedTableId=tbllsfTxMZL238kdA)
  - ExpenseAccount: multipleRecordLinks (linkedTableId=tblUOgeUt0HLOto5D)

TABLE: EmployeeContract
  - contractId: autoNumber
  - employeeId: multipleRecordLinks (linkedTableId=tblBnBVuyW1hmgQiE)
  - contractType: singleSelect (choices=permanent,fixed_term,casual,probation,internship)
  - contractStartDate: date
  - contractEndDate: date
  - probationEndDate: date
  - contractedSalary: currency
  - jobTitleOnContract: singleLineText
  - contractDocumentUrl: singleLineText
  - signedByEmployeeAt: date
  - signedByManagementAt: date
  - contractStatus: singleSelect (choices=draft,active,expired,terminated,renewed)
  - renewalReminderSentAt: dateTime
  - createdAt: createdTime

TABLE: LoanAccount
  - loanId: autoNumber
  - employeeId: multipleRecordLinks (linkedTableId=tblBnBVuyW1hmgQiE)
  - loanReferenceNumber: singleLineText
  - loanPurpose: singleLineText
  - loanAmount: currency
  - interestRatePercent: percent
  - loanDisbursementDate: date
  - repaymentStartDate: date
  - repaymentPeriodMonths: number (precision=0)
  - monthlyRepaymentAmount: currency
  - totalAmountRepaid: currency
  - outstandingBalance: formula (formula={fldJfE8YXKxpoVEvj} - {fldVT7dbWDTQVXrxn})
  - loanStatus: singleSelect (choices=pending_approval,active,fully_repaid,defaulted,written_off,rejected)
  - requestDate: date
  - approvalDate: date
  - approvedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - notes: multilineText
  - createdAt: createdTime
  - LoanRepaymentSchedule: multipleRecordLinks (linkedTableId=tblfuO7jXm8sZgi4z)

TABLE: LoanRepaymentSchedule
  - scheduleEntryId: autoNumber
  - loanId: multipleRecordLinks (linkedTableId=tblo4sUvUyANJDwB7)
  - employeeId: multipleRecordLinks (linkedTableId=tblBnBVuyW1hmgQiE)
  - installmentNumber: number (precision=0)
  - scheduledPaymentDate: date
  - scheduledAmount: currency
  - principalComponent: currency
  - interestComponent: currency
  - actualAmountDeducted: currency
  - shortfallAmount: currency
  - balanceAfterPayment: currency
  - paymentStatus: singleSelect (choices=pending,paid,partial,skipped,waived)
  - paymentDate: date
  - statementSmsSentAt: dateTime
  - createdAt: createdTime

TABLE: EmployeeAttendance
  - attendanceId: autoNumber
  - employeeId: multipleRecordLinks (linkedTableId=tblBnBVuyW1hmgQiE)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - attendanceDate: date
  - checkInTime: singleLineText
  - checkOutTime: singleLineText
  - hoursWorked: number (precision=0)
  - attendanceStatus: singleSelect (choices=present,absent,half_day,late,on_leave,public_holiday)
  - lateArrivalMinutes: number (precision=0)
  - overtimeHours: number (precision=0)
  - notes: multilineText
  - recordedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - createdAt: createdTime

TABLE: Customer
  - customerId: autoNumber
  - firstName: singleLineText
  - lastName: singleLineText
  - fullName: formula (formula={fldWUmUXub4CjihAz} & " " & {fldpPUlcrEpZIGIVF})
  - phoneNumber: phoneNumber
  - alternatePhoneNumber: phoneNumber
  - emailAddress: email
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - physicalAddress: multilineText
  - city: singleLineText
  - dateOfBirth: date
  - gender: singleSelect (choices=male,female)
  - customerType: singleSelect (choices=individual,business,wholesaler,retailer)
  - firstPurchaseDate: date
  - lastPurchaseDate: date
  - averageOrderValue: formula (formula="Unable to generate formula")
  - purchaseFrequencyCategory: singleSelect (choices=frequent,occasional,one_time,dormant,new)
  - preferredPaymentMethod: singleSelect (choices=cash,mpesa,bank_transfer,credit)
  - customerStatus: singleSelect (choices=active,inactive,blacklisted)
  - smsOptIn: checkbox
  - emailOptIn: checkbox
  - referralSource: singleLineText
  - createdAt: createdTime
  - SalesTransaction: multipleRecordLinks (linkedTableId=tblSxHCeySplinNxa)
  - DebtorAccount: multipleRecordLinks (linkedTableId=tblyuZyYzer7CboO3)
  - PartialDepositAccount: multipleRecordLinks (linkedTableId=tblTuqx8k9782JqRd)

TABLE: Supplier
  - supplierId: autoNumber
  - supplierName: singleLineText
  - supplierCode: singleLineText
  - contactPersonName: singleLineText
  - contactPersonPhone: phoneNumber
  - contactPersonEmail: email
  - companyPhoneNumber: phoneNumber
  - companyEmail: email
  - physicalAddress: multilineText
  - city: singleLineText
  - country: singleLineText
  - kraPin: singleLineText
  - bankName: singleLineText
  - bankAccountNumber: singleLineText
  - paymentTermsDays: number (precision=0)
  - totalOrdersPlaced: count
  - onTimeDeliveryRate: percent
  - supplierStatus: singleSelect (choices=active,inactive,blacklisted)
  - createdAt: createdTime
  - PurchaseOrder: multipleRecordLinks (linkedTableId=tbla3uBOYN7VXco2N)
  - ProductPriceHistory: multipleRecordLinks (linkedTableId=tbl2p8cBVBJbC3P54)
  - DeliveryAccount: multipleRecordLinks (linkedTableId=tblMGlFjMMFBPbR1a)

TABLE: ProductPriceHistory
  - priceHistoryId: autoNumber
  - productId: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - supplierId: multipleRecordLinks (linkedTableId=tblROUE6bR8J2ijvu)
  - previousPurchasePrice: currency
  - newPurchasePrice: currency
  - previousSellingPrice: currency
  - newSellingPrice: currency
  - priceDifference: formula (formula={fldpwNpyF3nMNQc5C} - {fldDWK66skeChTlxK})
  - priceChangeDirection: singleSelect (choices=increase,decrease,no_change)
  - purchasePriceChangeReason: singleLineText
  - priceEffectiveDate: date
  - priceAnnouncedBeforePurchase: checkbox
  - inventoryQuantityAtChange: number (precision=0)
  - fifoValueOfExistingStock: currency
  - smsSentToCustomers: checkbox
  - emailSentToCustomers: checkbox
  - customerNotificationCount: number (precision=0)
  - detectedBySystem: checkbox
  - createdAt: createdTime

TABLE: InventoryStock
  - stockId: autoNumber
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - productId: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - quantityOnHand: number (precision=0)
  - quantityReserved: number (precision=0)
  - quantityAvailable: formula (formula={fldB5QT40imMLwFbF} - {fldNx0PQ4NHIEQAen})
  - lastMovementDate: date
  - lastStockCountDate: date
  - lastStockCountQuantity: number (precision=0)
  - varianceFromLastCount: formula (formula={fldB5QT40imMLwFbF} - {fldWHzAP5cpR5dIEd})
  - updatedAt: lastModifiedTime

TABLE: InventoryLedger
  - ledgerEntryId: autoNumber
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - productId: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - movementType: singleSelect (choices=purchase_received,sale,adjustment,transfer_in,transfer_out,opening_balance,damage,theft_write_off,return_to_supplier)
  - quantityChange: number (precision=0)
  - quantityBefore: number (precision=0)
  - quantityAfter: number (precision=0)
  - unitCost: currency
  - totalMovementValue: currency
  - referenceType: singleLineText
  - referenceId: number (precision=0)
  - movementDate: date
  - movementNotes: multilineText
  - authorisedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - createdByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - createdAt: createdTime

TABLE: InventorySnapshot
  - snapshotId: autoNumber
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - productId: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - snapshotDate: date
  - quantityOnHand: number (precision=0)
  - unitCostAtSnapshot: currency
  - totalInventoryValue: formula (formula={flduF6zg19O9RPJNQ} * {fldcHDkyff27omXYH})
  - snapshotType: singleSelect (choices=daily,weekly,monthly,annual,adhoc)
  - createdAt: createdTime

TABLE: PurchaseOrder
  - purchaseOrderId: autoNumber
  - orderReferenceNumber: singleLineText
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - supplierId: multipleRecordLinks (linkedTableId=tblROUE6bR8J2ijvu)
  - orderDate: date
  - expectedDeliveryDate: date
  - actualDeliveryDate: date
  - vehicleRegistrationNumber: singleLineText
  - driverName: singleLineText
  - driverIdNumber: singleLineText
  - freightCost: currency
  - totalOrderValueIncFreight: formula (formula="Unable to generate formula")
  - totalQuantityRemaining: formula (formula="Unable to generate formula")
  - orderStatus: singleSelect (choices=pending,partial,completed,cancelled)
  - approvedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - notes: multilineText
  - createdAt: createdTime
  - PurchaseOrderItem: multipleRecordLinks (linkedTableId=tblYDolqpLDizFnFM)
  - PurchaseOrderDelivery: multipleRecordLinks (linkedTableId=tbljhHyxi42BFMOPA)
  - DeliveryAccount: multipleRecordLinks (linkedTableId=tblMGlFjMMFBPbR1a)

TABLE: PurchaseOrderItem
  - orderItemId: autoNumber
  - purchaseOrderId: multipleRecordLinks (linkedTableId=tbla3uBOYN7VXco2N)
  - productId: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - quantityOrdered: number (precision=0)
  - quantityDelivered: number (precision=0)
  - quantityRemaining: formula (formula={fldIUCDrm9F5EGfuU} - {fldkPCGVpEBw9wSsb})
  - unitPurchasePrice: currency
  - lineTotalValue: formula (formula={fldIUCDrm9F5EGfuU} * {fldFiC9LiMybqwYET})
  - deliveryStatus: singleSelect (choices=pending,partial,delivered,cancelled)
  - lastDeliveryDate: date
  - createdAt: createdTime
  - PurchaseOrderDeliveryItem: multipleRecordLinks (linkedTableId=tblDoRKWdGJjxQ8fU)

TABLE: PurchaseOrderDelivery
  - deliveryId: autoNumber
  - purchaseOrderId: multipleRecordLinks (linkedTableId=tbla3uBOYN7VXco2N)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - deliveryDate: date
  - deliveryReferenceNumber: singleLineText
  - vehicleRegistrationNumber: singleLineText
  - driverName: singleLineText
  - driverIdNumber: singleLineText
  - partialFreightCost: currency
  - deliveryNotes: multilineText
  - receivedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - createdAt: createdTime
  - PurchaseOrderDeliveryItem: multipleRecordLinks (linkedTableId=tblDoRKWdGJjxQ8fU)

TABLE: PurchaseOrderDeliveryItem
  - deliveryItemId: autoNumber
  - deliveryId: multipleRecordLinks (linkedTableId=tbljhHyxi42BFMOPA)
  - orderItemId: multipleRecordLinks (linkedTableId=tblYDolqpLDizFnFM)
  - productId: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - quantityDeliveredThisBatch: number (precision=0)
  - unitPurchasePrice: currency
  - lineTotalValue: formula (formula={fldJd0T3azcrA4pDu} * {fldHO4VyNDewg9Hmt})
  - createdAt: createdTime

TABLE: SalesTarget
  - targetId: autoNumber
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - targetYear: number (precision=0)
  - targetMonth: number (precision=0)
  - targetRevenueAmount: currency
  - targetTransactionCount: number (precision=0)
  - targetNewCustomerCount: number (precision=0)
  - setByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - createdAt: createdTime

TABLE: SalesTransaction
  - salesTransactionId: autoNumber
  - transactionReference: singleLineText
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - customerId: multipleRecordLinks (linkedTableId=tblTIPeb585fdOiqx)
  - salesAgentUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - transactionDate: date
  - transactionTime: singleLineText
  - subtotalAmount: currency
  - discountAmount: currency
  - discountPercent: percent
  - taxAmount: currency
  - totalAmount: currency
  - totalCostOfGoodsSold: currency
  - grossProfitAmount: formula (formula={fld49c2gH5R8fbBou} - {fldmhXz8TbijhpBKI})
  - grossProfitPercent: formula (formula=IF({fld49c2gH5R8fbBou}, {fld4HVS8nlD2bilmM} / {fld49c2gH5R8fbBou} * 100, BLANK()))
  - paymentMethod: singleSelect (choices=cash,mpesa,bank_transfer,credit,partial_deposit,mixed)
  - mpesaTransactionCode: singleLineText
  - debtorDepositApplied: currency
  - creditAmountOwed: currency
  - transactionStatus: singleSelect (choices=completed,void,refunded,partial,pending)
  - voidReason: singleLineText
  - notes: multilineText
  - createdAt: createdTime
  - SalesTransactionItem: multipleRecordLinks (linkedTableId=tblLgmiBBvsazvlGd)
  - DebtorAccount: multipleRecordLinks (linkedTableId=tblyuZyYzer7CboO3)
  - DebtorPayment: multipleRecordLinks (linkedTableId=tblt3CsdfIo2D55gY)

TABLE: SalesTransactionItem
  - salesItemId: autoNumber
  - salesTransactionId: multipleRecordLinks (linkedTableId=tblSxHCeySplinNxa)
  - productId: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - quantitySold: number (precision=0)
  - unitSellingPrice: currency
  - unitPurchasePrice: currency
  - fifoLayerDate: date
  - lineSubtotal: formula (formula={fldXdG9R6cU7VrB48}*{fld1Gdp2F9dq3YyI6})
  - lineDiscount: currency
  - lineTotalAmount: formula (formula={fldEUDGKqEuMVHave}-{fldrbGA5ofACDJUn2})
  - lineCostOfGoodsSold: formula (formula={fldXdG9R6cU7VrB48}*{fldWOFi1BPg47KPeZ})
  - lineGrossProfit: formula (formula={fldKKMets1XvwupXz}-{fldrhZluo01mgYsdc})
  - lineGrossProfitPercent: formula (formula=IF({fldKKMets1XvwupXz}, {fldma6rLxWyEIDGZH} / {fldKKMets1XvwupXz} * 100, BLANK()))
  - createdAt: createdTime

TABLE: SalesDailyCheck
  - checkId: autoNumber
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - checkDate: date
  - dayOfWeek: singleLineText
  - isWeekend: checkbox
  - isSunday: checkbox
  - isPublicHoliday: checkbox
  - publicHolidayName: singleLineText
  - salesRecordExists: checkbox
  - transactionCount: number (precision=0)
  - totalRevenue: currency
  - alertTriggered: checkbox
  - alertSentAt: dateTime
  - alertResolvedAt: dateTime
  - resolutionNotes: multilineText
  - createdAt: createdTime

TABLE: DebtorAccount
  - debtorAccountId: autoNumber
  - customerId: multipleRecordLinks (linkedTableId=tblTIPeb585fdOiqx)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - accountType: singleSelect (choices=credit_sale,partial_deposit)
  - originalTransactionId: multipleRecordLinks (linkedTableId=tblSxHCeySplinNxa)
  - originalAmount: currency
  - amountPaid: currency
  - outstandingBalance: formula (formula=IF(
  AND(
    {fldHK5ARrZww2ks3V},
    {fldXz8Gb2xgbDE7VM}
  ),
  {fldHK5ARrZww2ks3V} - {fldXz8Gb2xgbDE7VM},
  IF(
    {fldHK5ARrZww2ks3V},
    {fldHK5ARrZww2ks3V},
    BLANK()
  )
))
  - depositDate: date
  - expectedCollectionDate: date
  - lastReminderSentAt: dateTime
  - reminderCount: number (precision=0)
  - accountStatus: singleSelect (choices=open,partially_paid,fully_paid,written_off,refunded)
  - notes: multilineText
  - createdAt: createdTime
  - DebtorPayment: multipleRecordLinks (linkedTableId=tblt3CsdfIo2D55gY)

TABLE: DebtorPayment
  - debtorPaymentId: autoNumber
  - debtorAccountId: multipleRecordLinks (linkedTableId=tblyuZyYzer7CboO3)
  - paymentDate: date
  - amountPaid: currency
  - paymentMethod: singleSelect (choices=cash,mpesa,bank_transfer)
  - mpesaTransactionCode: singleLineText
  - paymentReference: singleLineText
  - balanceAfterPayment: currency
  - linkedSalesTransactionId: multipleRecordLinks (linkedTableId=tblSxHCeySplinNxa)
  - recordedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - createdAt: createdTime

TABLE: PartialDepositAccount
  - depositEntryId: autoNumber
  - depositReferenceNumber: singleLineText
  - customerId: multipleRecordLinks (linkedTableId=tblTIPeb585fdOiqx)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - depositDate: date
  - depositAmount: currency
  - amountRedeemed: currency
  - amountRemaining: formula (formula={fldEASTSYZH9MMDDf} - {fld8QJfEA9DeTrEVO})
  - depositPurpose: multilineText
  - linkedProductId: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - expectedCollectionDate: date
  - actualCollectionDate: date
  - depositStatus: singleSelect (choices=active,partially_redeemed,fully_redeemed,refunded,expired)
  - transferredToSalesAccountAt: dateTime
  - reminderCount: number (precision=0)
  - lastReminderSentAt: dateTime
  - refundAmount: currency
  - refundDate: date
  - notes: multilineText
  - createdAt: createdTime

TABLE: PayrollRun
  - payrollRunId: autoNumber
  - companyId: multipleRecordLinks (linkedTableId=tblrmxcv3yI0AKbkD)
  - payPeriodLabel: singleLineText
  - payPeriodYear: number (precision=0)
  - payPeriodMonth: number (precision=0)
  - runType: singleSelect (choices=regular,supplementary,bonus,off_cycle)
  - totalEmployeeCount: number (precision=0)
  - totalGrossSalary: currency
  - totalNssfDeductions: currency
  - totalNhifDeductions: currency
  - totalPayeDeductions: currency
  - totalLoanDeductions: currency
  - totalNetSalaryPayable: currency
  - runStatus: singleSelect (choices=draft,pending_approval,approved,posted,paid,cancelled)
  - preparedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - approvedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - approvedAt: dateTime
  - paymentDate: date
  - n8nWorkflowRunId: singleLineText
  - createdAt: createdTime
  - SalaryAccount: multipleRecordLinks (linkedTableId=tbl27XC7KOYs16rWX)

TABLE: SalaryAccount
  - salaryEntryId: autoNumber
  - payrollRunId: multipleRecordLinks (linkedTableId=tbluXxo0nPbHALg0L)
  - employeeId: multipleRecordLinks (linkedTableId=tblBnBVuyW1hmgQiE)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - payPeriodLabel: singleLineText
  - payPeriodYear: number (precision=0)
  - payPeriodMonth: number (precision=0)
  - basicSalary: currency
  - allowancesTotal: currency
  - grossSalary: formula (formula={fldqOFrJ0MfhwEQwr}+{fldYdOTIH3PansTIL})
  - nssfDeduction: currency
  - nhifDeduction: currency
  - payeDeduction: currency
  - loanDeduction: currency
  - otherDeductions: currency
  - totalDeductions: formula (formula={fldrWLDwaz3eONNyW}+{fldKDGXh7L9CsXuEt}+{fldoL55EYvLdLBYrf}+{fldP0OznP4XmndKsJ}+{fldgKiOXm6bAh9J9K})
  - netSalary: formula (formula={fld2iZUoHmadz69lR}-{fld29wAxc1FPLpDKy})
  - paymentMethod: singleSelect (choices=bank_transfer,mpesa,cash)
  - paymentStatus: singleSelect (choices=pending,paid,failed)
  - paymentDate: date
  - payslipSentViaSms: checkbox
  - payslipSentViaEmail: checkbox
  - createdAt: createdTime

TABLE: AllowanceAccount
  - allowanceEntryId: autoNumber
  - employeeId: multipleRecordLinks (linkedTableId=tblBnBVuyW1hmgQiE)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - payPeriodYear: number (precision=0)
  - payPeriodMonth: number (precision=0)
  - allowanceType: singleSelect (choices=housing,transport,medical,per_diem,airtime,meal,overtime,other)
  - allowanceDescription: multilineText
  - allowanceAmount: currency
  - isTaxable: checkbox
  - approvedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - paymentStatus: singleSelect (choices=pending,included_in_payroll,paid_separately)
  - paymentDate: date
  - createdAt: createdTime

TABLE: ExpenseAccount
  - expenseEntryId: autoNumber
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - expenseCategory: singleSelect (choices=utilities,office_supplies,marketing,repairs_maintenance,cleaning,security,staff_welfare,printing,subscriptions,professional_fees,travel,miscellaneous)
  - expenseSubCategory: singleLineText
  - expenseDescription: multilineText
  - expenseAmount: currency
  - expenseDate: date
  - vendorName: singleLineText
  - vendorPhoneNumber: phoneNumber
  - receiptNumber: singleLineText
  - receiptImageUrl: url
  - paymentMethod: singleSelect (choices=cash,mpesa,bank_transfer,petty_cash)
  - isRecurring: checkbox
  - recurringFrequency: singleSelect (choices=monthly,quarterly,annual)
  - isLinkedToEmployee: checkbox
  - linkedEmployeeId: multipleRecordLinks (linkedTableId=tblBnBVuyW1hmgQiE)
  - approvalStatus: singleSelect (choices=pending,approved,rejected)
  - approvedByUserId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - approvedAt: dateTime
  - rejectionReason: singleLineText
  - accountingPeriodYear: number (precision=0)
  - accountingPeriodMonth: number (precision=0)
  - createdAt: createdTime

TABLE: RentAccount
  - rentEntryId: autoNumber
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - landlordName: singleLineText
  - landlordPhoneNumber: phoneNumber
  - landlordEmail: email
  - propertyAddress: multilineText
  - leaseStartDate: date
  - leaseEndDate: date
  - leaseRenewalStatus: singleSelect (choices=active,renewal_pending,expired,terminated)
  - monthlyRentAmount: currency
  - rentPaymentDate: date
  - rentCoveredPeriodStart: date
  - rentCoveredPeriodEnd: date
  - amountPaid: currency
  - arrearsAmount: currency
  - paymentMethod: singleSelect (choices=bank_transfer,mpesa,cash)
  - paymentReference: singleLineText
  - annualRentAmount: formula (formula={fldLl9xBNRuw033BO} * 12)
  - lastEscalationDate: date
  - lastEscalationPercent: percent
  - paymentStatus: singleSelect (choices=paid,late,partial,missed)
  - accountingPeriodYear: number (precision=0)
  - accountingPeriodMonth: number (precision=0)
  - createdAt: createdTime

TABLE: DeliveryAccount
  - deliveryEntryId: autoNumber
  - purchaseOrderId: multipleRecordLinks (linkedTableId=tbla3uBOYN7VXco2N)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - supplierId: multipleRecordLinks (linkedTableId=tblROUE6bR8J2ijvu)
  - deliveryDate: date
  - freightAmount: currency
  - freightBasis: singleSelect (choices=per_km,flat_rate,per_kg,percentage_of_order)
  - transportProviderName: singleLineText
  - vehicleRegistrationNumber: singleLineText
  - driverName: singleLineText
  - driverIdNumber: singleLineText
  - distanceKm: number (precision=0)
  - orderValueDelivered: currency
  - freightAsPercentOfOrder: formula (formula=IF({fld3nHjMINLNG8S3N} > 0, {fldZVHoVtAGvVhDd4} / {fld3nHjMINLNG8S3N} * 100, BLANK()))
  - paymentStatus: singleSelect (choices=pending,paid,included_in_invoice)
  - paymentDate: date
  - accountingPeriodYear: number (precision=0)
  - accountingPeriodMonth: number (precision=0)
  - createdAt: createdTime

TABLE: SalesAccount
  - salesAccountEntryId: autoNumber
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - entryDate: date
  - accountingPeriodYear: number (precision=0)
  - accountingPeriodMonth: number (precision=0)
  - totalTransactionCount: number (precision=0)
  - totalCustomerCount: number (precision=0)
  - totalNewCustomerCount: number (precision=0)
  - totalReturningCustomerCount: formula (formula={fldonmihgNcRw6aNG} - {fldJ0Xz52jv0woOCW})
  - totalQuantitySold: number (precision=0)
  - grossRevenue: currency
  - totalDiscountsGiven: currency
  - netRevenue: formula (formula={fldGomJgQklFX4Z9O} - {fldOrG7VahH4B0KCH})
  - totalCostOfGoodsSold: currency
  - grossProfit: formula (formula={fldnDIAVob0EQWkjw} - {fldM6DtAf0FOSR1yT})
  - grossProfitMarginPercent: formula (formula=IF({fldnDIAVob0EQWkjw}, ({fldlfQMI7ns5QqQzR} / {fldnDIAVob0EQWkjw}) * 100, BLANK()))
  - totalCashCollected: currency
  - totalMpesaCollected: currency
  - totalBankTransferCollected: currency
  - totalCreditSales: currency
  - totalDepositRedemptions: currency
  - salesTargetAmount: currency
  - targetAchievementPercent: formula (formula=IF({fld9kdWLkpJwMCdZ6}, ({fldnDIAVob0EQWkjw} / {fld9kdWLkpJwMCdZ6}) * 100, BLANK()))
  - isWeekday: checkbox
  - createdAt: createdTime

TABLE: AssetAccount
  - assetEntryId: autoNumber
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - productId: multipleRecordLinks (linkedTableId=tbleEIOLaQ9F05JA5)
  - categoryId: multipleRecordLinks (linkedTableId=tblFI7n9k06BwScTL)
  - movementType: singleSelect (choices=purchase_in,sale_out,adjustment,opening_balance,write_off,transfer_in,transfer_out)
  - referenceType: singleLineText
  - referenceId: number (precision=0)
  - quantityMoved: number (precision=0)
  - unitCost: currency
  - totalMovementValue: formula (formula={fldbGCHeLCEXxqBC0}*{fldzLSTcUkvLfzLVe})
  - stockQuantityBefore: number (precision=0)
  - stockQuantityAfter: number (precision=0)
  - assetValueBefore: currency
  - assetValueAfter: currency
  - movementDate: date
  - accountingPeriodYear: number (precision=0)
  - accountingPeriodMonth: number (precision=0)
  - notes: multilineText
  - createdAt: createdTime

TABLE: ChartOfAccounts
  - accountCode: singleLineText
  - accountName: singleLineText
  - accountType: singleSelect (choices=asset,liability,equity,revenue,expense)
  - accountSubType: singleLineText
  - normalBalance: singleSelect (choices=debit,credit)
  - isActive: checkbox
  - createdAt: createdTime
  - FinanceJournalEntry (debitAccountCode): multipleRecordLinks (linkedTableId=tblphIXArG6IeOV2M)
  - FinanceJournalEntry (creditAccountCode): multipleRecordLinks (linkedTableId=tblphIXArG6IeOV2M)

TABLE: FinanceJournalEntry
  - journalEntryId: autoNumber
  - journalEntryNumber: singleLineText
  - entryDate: date
  - accountingPeriodYear: number (precision=0)
  - accountingPeriodMonth: number (precision=0)
  - sourceType: singleLineText
  - sourceId: number (precision=0)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - debitAccountCode: multipleRecordLinks (linkedTableId=tbllFYfx1FkytBXPc)
  - debitAccountName: singleLineText
  - creditAccountCode: multipleRecordLinks (linkedTableId=tbllFYfx1FkytBXPc)
  - creditAccountName: singleLineText
  - entryAmount: currency
  - entryDescription: multilineText
  - isReversed: checkbox
  - isSystemGenerated: checkbox
  - createdAt: createdTime

TABLE: SystemAuditLog
  - auditId: autoNumber
  - userId: multipleRecordLinks (linkedTableId=tblLKkenvm7ysE0H0)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - actionType: singleSelect (choices=INSERT,UPDATE,DELETE,APPROVE,REJECT,LOGIN,LOGOUT,EXPORT)
  - tableName: singleLineText
  - recordId: number (precision=0)
  - oldValues: multilineText
  - newValues: multilineText
  - changedColumns: multilineText
  - ipAddress: singleLineText
  - actionDescription: multilineText
  - actionTimestamp: dateTime

TABLE: NotificationLog
  - notificationId: autoNumber
  - recipientType: singleSelect (choices=employee,customer,manager,system)
  - recipientId: number (precision=0)
  - recipientPhoneNumber: phoneNumber
  - recipientEmail: email
  - notificationChannel: singleSelect (choices=sms,email,whatsapp,in_app)
  - notificationType: singleLineText
  - notificationSubject: singleLineText
  - notificationBody: multilineText
  - deliveryStatus: singleSelect (choices=pending,sent,delivered,failed,bounced)
  - providerMessageId: singleLineText
  - sentAt: dateTime
  - deliveredAt: dateTime
  - failureReason: multilineText
  - retryCount: number (precision=0)
  - relatedRecordType: singleLineText
  - relatedRecordId: number (precision=0)
  - businessUnitId: multipleRecordLinks (linkedTableId=tblDTuzHT4Yd2s7b1)
  - n8nWorkflowRunId: singleLineText
  - createdAt: createdTime
  - deliveryTimeSeconds: number (precision=0)
  - notificationSummary: aiText
